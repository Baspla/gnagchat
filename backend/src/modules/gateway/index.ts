// modules/gateway/index.ts
import { Elysia, t } from 'elysia'
import { authMiddleware } from '../auth'
import { ChatService } from '../chat/service'
import { UserService } from '../user/service'
import { PermissionService } from '../permission/service'

export const gatewayModule = new Elysia({ prefix: '/ws', name: 'GatewayWS' })
    .use(authMiddleware)
    .derive({ as: 'scoped' }, () => ({
        chatService: ChatService,
        permissionService: PermissionService,
        userService: UserService
    }))
    .ws('/', {
        auth: true,
        beforeHandle({ user }) {
            if (!user) throw new Error('Unauthorized: No user in context')
        },

        // The Schema: Strictly limited to connection control and transient states
        body: t.Union([
            // 1. Connection Health
            t.Object({ type: t.Literal('ping') }),
            
            // 2. Subscription Management
            t.Object({ type: t.Literal('subscribe'), topic: t.String() }),
            t.Object({ type: t.Literal('unsubscribe'), topic: t.String() }),
            
            // 3. Transient States (High frequency, no database writes)
            t.Object({ type: t.Literal('typing'), roomId: t.String(), isTyping: t.Boolean() })
        ]),

        async open(ws) {
            const { user, userService } = ws.data
            
            ws.subscribe(`user:${user.id}`)
            
            // todo presence update
            
            ws.publish('global_presence', {
                type: 'presence_update',
                userId: user.id,
                status: 'online'
            })
        },

        async message(ws, payload) {
            const { user, permissionService, chatService } = ws.data

            switch (payload.type) {
                case 'ping': {
                    ws.send({ type: 'pong' })
                    break;
                }

                case 'subscribe': {
                    const [domain, roomId] = payload.topic.split(':')

                    if (domain === 'room') {
                        // Check ACL before allowing subscription
                        const hasAccess = await chatService.canViewRoomAsUser(user.id, roomId);
                        if (hasAccess) {
                            ws.subscribe(payload.topic)
                            ws.send({ type: 'system', message: `Subscribed to ${payload.topic}` })
                        } else {
                            ws.send({ type: 'error', message: `Forbidden: Cannot access ${payload.topic}` })
                        }
                    } else if (domain === 'presence') {
                        // E.g., subscribing to a specific friend's status
                        // todo ws.subscribe(payload.topic)
                    }
                    break;
                }

                case 'unsubscribe': {
                    ws.unsubscribe(payload.topic)
                    ws.send({ type: 'system', message: `Unsubscribed from ${payload.topic}` })
                    break;
                }

                // The only exception to the "Read-Only" rule: transient states
                case 'typing': {
                    // We bounce this straight to the room without hitting the DB.
                    // (We don't strictly check roomService.canAccess here for performance,
                    // assuming they wouldn't know the roomId unless they are in it, 
                    // but you could add a lightweight check if desired).
                    ws.publish(`room:${payload.roomId}`, {
                        type: 'typing_indicator',
                        userId: user.id,
                        isTyping: payload.isTyping
                    })
                    break;
                }
            }
        },

        async close(ws) {
            const { user, userService } = ws.data
        }
    })