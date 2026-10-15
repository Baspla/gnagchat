import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, primaryKey, check, index, UniqueConstraint } from 'drizzle-orm/sqlite-core';

// Singleton table for server-wide settings
export const serverSettings = sqliteTable('server_settings', {
    id: text('id').primaryKey().$defaultFn(() => 'singleton'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    clubOrder: text('club_order', { mode: 'json' }).notNull().$defaultFn(() => '[]'),
    
}, (table) => [
    check('server_settings_singleton_check', sql`(${table.id} = 'singleton')`),
]);

export type ServerSettings = typeof serverSettings.$inferSelect;
