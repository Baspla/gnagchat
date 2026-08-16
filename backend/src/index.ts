import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { seedDatabase } from './db/seed';
import { closeDb } from './db';
import { authMiddleware } from './modules/auth';
import { userModule } from './modules/user';
import { chatModule } from './modules/chat';
import { livekitModule } from './modules/livekit';
import { gatewayModule } from './modules/gateway';
import { createLogger } from './lib/logger';
import { isAppError, toErrorResponse } from './lib/errors';

const logger = createLogger('app');

export const app = new Elysia()
    .onStart(() => {
        logger.info('Elysia starting...');
        seedDatabase();
    })
    .onRequest(({ request }) => {
        // Skip noisy health-check paths
        if (
            request.url.includes('/api/betterauth/auth/get-session') ||
            request.url.includes('/api/v1/gateway/token')
        ) {
            return;
        }
        logger.debug('request', { method: request.method, url: request.url });
    })
    .onError(({ code, error, set }) => {
        if (isAppError(error)) {
            set.status = error.statusCode;
            logger.warn('request failed', {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
            });
            return toErrorResponse(error);
        }

        // Elysia built-in errors (e.g. validation, NOT_FOUND)
        if (code === 'NOT_FOUND') {
            set.status = 404;
            return { error: { code: 'NOT_FOUND', message: 'Not found' } };
        }
        if (code === 'VALIDATION') {
            set.status = 400;
            return { error: { code: 'VALIDATION', message: 'Validation failed', details: error } };
        }

        // Unknown error — log and return a safe generic response
        logger.error('unhandled error', { message: String(error) });
        set.status = 500;
        return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } };
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
                    .use(gatewayModule)
            )
    )
    .listen(3000);

logger.info('backend running', { port: app.server?.port });

// Graceful shutdown: checkpoint WAL before exit
const shutdown = async (signal: string) => {
    logger.info('shutdown signal received', { signal });
    await closeDb();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export type App = typeof app;