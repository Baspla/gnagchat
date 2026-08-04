import { Elysia, t } from 'elysia'
import { ChatService } from './service'
import { Modules } from '../../../../shared/constants'
import { authMiddleware } from '../auth'

export const chatModule = new Elysia({ prefix: '/chat', name: Modules.CHAT })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, () => ({
        chatService: ChatService
    }))
    .post('/channels', async ({ user, body, status, chatService }) => {
        try {
            const channel = await chatService.createChannel(body.name);
            return channel;
        } catch (e: any) {
            return status('Bad Request', e.message || 'Failed to create channel');
        }
    }, {
        body: t.Object({
            name: t.String()
        }),
        auth: true
    })
    .get('/channels', async ({ user, status, chatService }) => {
        try {
            return await chatService.getAccessibleChannelsAsUser(user.id);
        } catch (e: any) {
            return status('Internal Server Error', e.message || 'Failed to fetch channels');
        }
    }, {
        auth: true
    })
    .post('/rooms/:roomId/messages', async ({ user, params, body, server, status, chatService }) => {
        try {
            console.log(`User ${user.id} is sending a message to room ${params.roomId}: ${body.content}`);
            const savedMessage = await chatService.saveMessageAsUser(user.id, params.roomId, body.content, server!);
            return savedMessage;
        } catch (e: any) {
            return status('Forbidden', e.message || 'Access denied or room not found');
        }
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        body: t.Object({
            content: t.String()
        }),
        auth: true,
        assertWSServerExists: true
    })
    .get('/rooms/:roomId/history', async ({ user, params, query, status, chatService }) => {
        try {
            const limit = query.limit ? Number(query.limit) : 50;
            return await chatService.getHistoryAsUser(user.id, params.roomId, limit);
        } catch (e: any) {
            return status('Forbidden', e.message || 'Access denied or room not found');
        }
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        query: t.Object({
            limit: t.Optional(t.Numeric())
        }),
        auth: true
    })
    .post('/rooms/:roomId/read', async ({ user, params, status, chatService }) => {
        try {
            await chatService.markRoomAsReadAsUser(user.id, params.roomId);
            return { success: true };
        } catch (e: any) {
            return status('Forbidden', e.message || 'Access denied or room not found');
        }
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    })
    .get('/rooms/:roomId/unread', async ({ user, params, status, chatService }) => {
        try {
            const count = await chatService.getUnreadCountAsUser(user.id, params.roomId);
            return { unreadCount: count };
        } catch (e: any) {
            return status('Forbidden', e.message || 'Access denied or room not found');
        }
    }, {
        params: t.Object({
            roomId: t.String()
        }),
        auth: true
    });