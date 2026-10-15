import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';
// @ts-ignore Bun provides the `bun:sqlite` module at runtime.
import { Database } from 'bun:sqlite';
import { createLogger } from '../lib/logger';
import { env } from '../env';

const logger = createLogger('db');

const client = new Database(env.DATABASE_URL);
client.run('PRAGMA journal_mode = WAL;');
client.run('PRAGMA foreign_keys = ON;');
export const db = drizzle(client, { schema });

await migrate(db, { migrationsFolder: `${import.meta.dir}/../../drizzle` });

/**
 * Checkpoints the WAL and closes the database connection.
 * Should be called during graceful shutdown.
 */
export async function closeDb(): Promise<void> {
    logger.info('checkpointing WAL before closing database');
    client.run('PRAGMA wal_checkpoint(TRUNCATE);');
    client.close();
}
