import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema';
import { Database } from 'bun:sqlite';

const client = new Database('sqlite.db');
export const db = drizzle(client, { schema });

await migrate(db, {migrationsFolder: 'drizzle'});
