import { Elysia, t } from 'elysia';
import { auth } from '../auth/service';
import { ChatService } from '../chat/service';

export const centrifugoModule = new Elysia({ prefix: '/centrifugo', name: 'centrifugo' })
    .post('/connect', async ({ body, headers, status }) => {
        try {
            console.log('Centrifugo connect request:', body);

            // Extract session from forwarded cookies/headers
            const session = await auth.api.getSession({
                headers: headers as Record<string, string>,
            });

            if (!session || !session.user) {
                console.warn('Centrifugo connect: No valid session');
                return {
                    error: {
                        code: 403,
                        message: 'Unauthorized',
                    },
                    disconnect: {
                        code: 3000,
                        reconnect: false,
                    },
                };
            }

            console.log(`Centrifugo connect: user ${session.user.id} authenticated`);
            return {
                result: {
                    user: String(session.user.id),
                    meta: {
                        name: session.user.name || 'Unknown',
                    },
                },
            };
        } catch (error) {
            console.error('Centrifugo connect error:', error);
            return {
                error: {
                    code: 500,
                    message: 'Internal server error',
                },
                disconnect: {
                    code: 3001,
                    reconnect: false,
                },
            };
        }
    }, {
        body: t.Any(),
    })
    .post('/subscribe', async ({ body, status }) => {
        try {
            const { user: userId, channel } = body as { user?: string; channel?: string };

            if (!userId || !channel) {
                console.warn('Centrifugo subscribe: Missing user or channel');
                return {
                    error: {
                        code: 400,
                        message: 'Missing user or channel',
                    },
                };
            }

            // Parse channel: expected format "room:<roomId>"
            if (!channel.startsWith('room:')) {
                console.warn(`Centrifugo subscribe: Unknown channel format: ${channel}`);
                return {
                    error: {
                        code: 400,
                        message: `Unknown channel: ${channel}`,
                    },
                };
            }

            const roomId = channel.slice(5); // Remove "room:"

            // Check room access
            const canAccess = await ChatService.canViewRoomAsUser(userId, roomId);
            if (!canAccess) {
                console.warn(`Centrifugo subscribe: User ${userId} cannot access room ${roomId}`);
                return {
                    error: {
                        code: 403,
                        message: 'Forbidden',
                    },
                };
            }

            console.log(`Centrifugo subscribe: user ${userId} subscribed to ${channel}`);
            return {
                result: {},
            };
        } catch (error) {
            console.error('Centrifugo subscribe error:', error);
            return {
                error: {
                    code: 500,
                    message: 'Internal server error',
                },
            };
        }
    }, {
        body: t.Any(),
    });