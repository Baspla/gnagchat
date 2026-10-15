import { sqliteTable, text, integer, uniqueIndex, primaryKey, check, index } from 'drizzle-orm/sqlite-core';
import { user } from '../user/schema';

export const club = sqliteTable('club', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    name: text('name').notNull(),
    description: text('description'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().$defaultFn(() => false),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    channelOrder: text('channel_order', { mode: 'json' }).notNull().$defaultFn(() => '[]'),
});

export const clubMembership = sqliteTable('club_membership', {
    clubId: text('club_id').references(() => club.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    role: text('role', { enum: ['member', 'manager'] }).notNull().$defaultFn(() => 'member'),
}, (table) => [
    primaryKey({ columns: [table.clubId, table.userId] }),
]);

export type Club = typeof club.$inferSelect;
export type ClubMembership = typeof clubMembership.$inferSelect;
