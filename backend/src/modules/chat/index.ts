import { Elysia, t } from 'elysia'
import { ChatService } from './service'
import { Modules } from '@gnagchat/shared/constants'
import { authMiddleware } from '../auth'
import { createLogger } from '../../lib/logger'

const logger = createLogger('chat');

export const chatModule = new Elysia({ prefix: '/chat', name: Modules.CHAT })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, () => ({
        chatService: ChatService
    }))
    .post('/channels', async ({ body, chatService, status }) => {
        const result = await chatService.createChannel(body.name);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return result.value;
    }, {
        body: t.Object({
            name: t.String({
                minLength: 3,
                maxLength: 50,
                examples: ['General', 'Random', 'Support'],
                description: 'The name of the channel to create'
            })
        }),
        auth: true
    })
    .get('/channels', async ({ user, chatService, status }) => {
        const result = await chatService.getAccessibleChannelsAsUser(user.id);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return result.value;
    }, {
        auth: true
    })
    .delete('/channels/:roomId', async ({ user, params, chatService, status }) => {
        const result = await chatService.deleteChannelAsUser(user.id, params.roomId);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return result.value;
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .post('/rooms/:roomId/messages', async ({ user, params, body, chatService, status }) => {
        logger.debug('sending message', { userId: user.id, roomId: params.roomId });
        const result = await chatService.saveMessageAsUser(user.id, params.roomId, body.content, body.nonce);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return result.value;
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        body: t.Object({
            content: t.String(),
            nonce: t.Optional(t.String())
        }),
        auth: true
    })
    .get('/rooms/:roomId/history', async ({ user, params, query, chatService, status }) => {
        const limit = query.limit ? Number(query.limit) : 50;
        const result = await chatService.getHistoryAsUser(user.id, params.roomId, limit, query.cursor);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return result.value;
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        query: t.Object({
            limit: t.Optional(t.Numeric()),
            cursor: t.Optional(t.String()),
        }),
        auth: true
    })
    .get('/rooms/:roomId', async ({ user, params, chatService, status }) => {
        const result = await chatService.getRoomAsUser(user.id, params.roomId);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return result.value;
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .post('/rooms/:roomId/read', async ({ user, params, chatService }) => {
        // Infallible (no declared error type)
        await chatService.markRoomAsReadAsUser(user.id, params.roomId);
        return { success: true };
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .get('/rooms/:roomId/unread', async ({ user, params, chatService }) => {
        // Infallible (no declared error type)
        const unread = await chatService.getUnreadCountAsUser(user.id, params.roomId);
        return { unreadCount: unread.value };
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    });