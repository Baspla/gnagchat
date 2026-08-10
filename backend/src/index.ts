import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { seedDatabase } from './db/seed';
import { closeDb } from './db';
import { authMiddleware } from './modules/auth';
import { userModule } from './modules/user';
import { chatModule } from './modules/chat';
import { livekitModule } from './modules/livekit';


export const app = new Elysia()
    .onStart(() => {
        console.log('Elysia is starting...')
        seedDatabase()
    })
    .onRequest(({ request }) => {
        // filter out /api/betterauth/auth/get-session
        if (request.url.includes('/api/betterauth/auth/get-session')) {
            return;
        }
        console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
    })
    .use(cors())
    .use(cookie())
    .use(authMiddleware)
    .group('/api', (api) =>
        api
            .get('/', () => ({ versions: ['v1'] }))
            .group('/v1', (v1) =>
                v1
                    .get('/', () => ({ message: 'API v1' }))
                    .get('/health', () => ({ status: 'ok' }))
                    .get('/status', () => ({ status: 'online' }))
                    .use(userModule)
                    .use(chatModule)
                    .use(livekitModule)
            )
    )
    .listen(3000);

console.log(`Backend running at ${app.server?.hostname}:${app.server?.port}`);

// Graceful shutdown: checkpoint WAL before exit
const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    await closeDb();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export type App = typeof app;
