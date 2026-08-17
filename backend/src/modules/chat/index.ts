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
    .post('/channels', async ({ user, body, chatService }) => {
        const channel = await chatService.createChannel(body.name);
        return channel;
    }, {
        body: t.Object({
            name: t.String()
        }),
        auth: true
    })
    .get('/channels', async ({ user, chatService }) => {
        return await chatService.getAccessibleChannelsAsUser(user.id);
    }, {
        auth: true
    })
    .delete('/channels/:roomId', async ({ user, params, chatService }) => {
        return await chatService.deleteChannelAsUser(user.id, params.roomId);
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .post('/rooms/:roomId/messages', async ({ user, params, body, chatService }) => {
        logger.debug('sending message', { userId: user.id, roomId: params.roomId });
        const savedMessage = await chatService.saveMessageAsUser(user.id, params.roomId, body.content, body.nonce);
        return savedMessage;
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
    .get('/rooms/:roomId/history', async ({ user, params, query, chatService }) => {
        const limit = query.limit ? Number(query.limit) : 50;
        return await chatService.getHistoryAsUser(user.id, params.roomId, limit);
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        query: t.Object({
            limit: t.Optional(t.Numeric())
        }),
        auth: true
    })
    .get('/rooms/:roomId', async ({ user, params, chatService }) => {
        return await chatService.getRoomAsUser(user.id, params.roomId);
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .post('/rooms/:roomId/read', async ({ user, params, chatService }) => {
        await chatService.markRoomAsReadAsUser(user.id, params.roomId);
        return { success: true };
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .get('/rooms/:roomId/unread', async ({ user, params, chatService }) => {
        const count = await chatService.getUnreadCountAsUser(user.id, params.roomId);
        return { unreadCount: count };
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    });
