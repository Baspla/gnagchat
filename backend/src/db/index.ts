import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';
// @ts-ignore Bun provides the `bun:sqlite` module at runtime.
import { Database } from 'bun:sqlite';
import { createLogger } from '../lib/logger';

const logger = createLogger('db');

const client = new Database('data/sqlite.db');
client.run('PRAGMA journal_mode = WAL;');
export const db = drizzle(client, { schema });

await migrate(db, {migrationsFolder: 'drizzle'});

/**
 * Checkpoints the WAL and closes the database connection.
 * Should be called during graceful shutdown.
 */
export async function closeDb(): Promise<void> {
    logger.info('checkpointing WAL before closing database');
    client.run('PRAGMA wal_checkpoint(TRUNCATE);');
    client.close();
}
