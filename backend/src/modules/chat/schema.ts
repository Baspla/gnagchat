import { sqliteTable, text, integer, uniqueIndex, primaryKey, check, index } from 'drizzle-orm/sqlite-core';
import { user } from '../user/schema';
import { sql } from 'drizzle-orm/sql';
import { club } from '../club/schema';

export const room = sqliteTable('room', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type', { enum: ['channel', 'dm'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const channelMetadata = sqliteTable('channel_metadata', {
  clubId: text('club_id').references(() => club.id, { onDelete: 'cascade' }).notNull(),
  roomId: text('room_id').references(() => room.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, (table) => [
  primaryKey({ columns: [table.clubId, table.roomId] }),
  uniqueIndex('channel_metadata_name_idx').on(table.clubId, table.name),
]);

export const dmMetadata = sqliteTable('dm_metadata', {
  roomId: text('room_id').primaryKey().references(() => room.id, { onDelete: 'cascade' }),
  userAId: text('user_a_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  userBId: text('user_b_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  uniqueIndex('dm_metadata_participants_idx').on(table.userAId, table.userBId),
  check('dm_metadata_participants_order_check', sql`(${table.userAId} < ${table.userBId})`),
]);

export const message = sqliteTable('message', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    roomId: text('room_id').references(() => room.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
    index('message_room_created_idx').on(table.roomId, table.createdAt, table.id),
]);

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
export type ChannelMetadata = typeof channelMetadata.$inferSelect;
export type DirectMessageMetadata = typeof dmMetadata.$inferSelect;
export type Message = typeof message.$inferSelect;