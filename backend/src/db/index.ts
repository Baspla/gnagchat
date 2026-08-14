import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';
//ts-ignore-next-line
import { Database } from 'bun:sqlite';

const client = new Database('data/sqlite.db');
client.run('PRAGMA journal_mode = WAL;');
export const db = drizzle(client, { schema });

await migrate(db, {migrationsFolder: 'drizzle'});

/**
 * Checkpoints the WAL and closes the database connection.
 * Should be called during graceful shutdown.
 */
export async function closeDb(): Promise<void> {
    // Checkpoint the WAL to ensure all data is written to the main database file
    console.log('Checkpointing WAL before closing the database...');
    client.run('PRAGMA wal_checkpoint(TRUNCATE);');
    client.close();
}