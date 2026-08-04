// db/schema/chat.ts
import { sqliteTable, text, integer, uniqueIndex, primaryKey, check } from 'drizzle-orm/sqlite-core';
import { user } from '../user/schema';
import { sql } from 'drizzle-orm/sql';

// 1. The Core Supertype
export const room = sqliteTable('room', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    // 'type' tells the frontend which subtype table to look at for metadata
    type: text('type', { enum: ['channel', 'dm'] }).notNull(), 
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 2. Subtype A: Channels
export const channel = sqliteTable('channel', {
    // The Room ID is BOTH the Primary Key AND a Foreign Key!
    roomId: text('room_id').primaryKey().references(() => room.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aclGroupId: text('acl_group_id'), 
});

// 3. Subtype B: Direct Messages
export const directMessage = sqliteTable('direct_message', {
    // The Room ID is BOTH the Primary Key AND a Foreign Key!
    roomId: text('room_id').primaryKey().references(() => room.id, { onDelete: 'cascade' }),
    userAId: text('user_a_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    userBId: text('user_b_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
    uniqueIndex('dm_participants_idx').on(table.userAId, table.userBId),
    check('dm_participants_order_check', sql`(${table.userAId} < ${table.userBId})`), // Ensure userAId is always less than userBId for uniqueness
]);

// 4. The Unified Messages Table
export const message = sqliteTable('message', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    roomId: text('room_id').references(() => room.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const roomReadState = sqliteTable('room_read_state', {
    roomId: text('room_id')
        .references(() => room.id, { onDelete: 'cascade' })
        .notNull(),
    userId: text('user_id')
        .references(() => user.id, { onDelete: 'cascade' })
        .notNull(),
    lastReadAt: integer('last_read_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
}, (table) => [
    primaryKey({ columns: [table.roomId, table.userId] })
]);

export type Room = typeof room.$inferSelect;
export type Channel = typeof channel.$inferSelect;
export type DirectMessage = typeof directMessage.$inferSelect;
export type Message = typeof message.$inferSelect;