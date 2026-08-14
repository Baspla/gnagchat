import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { broadcastMessage, generateCentrifugoToken } from "./service";
import type { WsMessage } from "$shared/dto/ws-message";

export const gatewayModule = new Elysia({ prefix: '/gateway', name: Modules.GATEWAY })
    .use(authMiddleware)
    .get("/token", async ({ query, user, status }) => {
        try {
            const token = await generateCentrifugoToken(user, query.deviceId);
            return { token };
        } catch (e: any) {
            return status('Internal Server Error', e.message || 'Failed to generate connection token');
        }
    }, {
        query: t.Object({
            deviceId: t.String()
        }),
        auth: true
    })
    .get("/test", async ({ user, status }) => {
        try {
            const message: WsMessage = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                payload: {
                    type: "system",
                    data: { message: `Test message for user ${user.id}` },
                },
            };
            broadcastMessage([`user:${user.id}`], message);
            return { message: `Test message sent to user ${user.id}`, messageid: message.id };
        }
        catch (e: any) {
            return status('Internal Server Error', e.message || 'Failed to send test message');
        }
    }, {
        auth: true
    });


