import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { seedDatabase } from './db/seed';
import { authMiddleware } from './modules/auth';
import { userModule } from './modules/user';


export const app = new Elysia()
    .onStart(() => {
        console.log('Elysia is starting...')
        seedDatabase()
    })
    .onRequest(({ request }) => {
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
            )
    )
    .listen(3000);

console.log(`Backend running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;