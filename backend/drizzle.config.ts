import { defineConfig } from 'drizzle-kit';
// @ts-ignore - this file is only used in the build process, so we can ignore missing types here
if (!process.env.GNAGCHAT_DATABASE_URL) throw new Error('GNAGCHAT_DATABASE_URL is not set');

export default defineConfig({
	schema: './src/db/schema.ts',
	dbCredentials: {
		// @ts-ignore
		url: process.env.GNAGCHAT_DATABASE_URL
	},
	verbose: true,
	strict: true,
	dialect: 'sqlite'
});
