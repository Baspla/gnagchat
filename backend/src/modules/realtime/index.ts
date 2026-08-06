import { Elysia, sse } from 'elysia';
import { Modules } from '@gnagchat/shared/constants';
import { authMiddleware } from '../auth';
import {
    registerConnection,
    unregisterConnection,
    recalculateSubscriptions,
} from './service';

export const realtimeModule = new Elysia({ prefix: '/gateway', name: Modules.GATEWAY })
    .use(authMiddleware)
    .get('/', async function* ({ request, user }) {
        const userId = user.id;
        const connectionId = crypto.randomUUID();

        const queue: ReturnType<typeof sse>[] = [];
        let resolveNext: (() => void) | null = null;

        const push = (event: ReturnType<typeof sse>) => {
            queue.push(event);
            if (resolveNext) {
                resolveNext();
                resolveNext = null;
            }
        };

        // -> START LIFECYCLE
        registerConnection(userId, connectionId, push);
        await recalculateSubscriptions(userId);

        try {
            while (!request.signal.aborted) {
                if (queue.length === 0) {
                    await new Promise<void>((resolve) => {
                        resolveNext = resolve;
                    });
                }
                while (queue.length > 0) {
                    const event = queue.shift();
                    if (event) yield event;
                }
            }
        } finally {
            // -> END LIFECYCLE (Tab closed / network dropped)
            unregisterConnection(userId, connectionId);
        }
    }, {
        auth: true
    });