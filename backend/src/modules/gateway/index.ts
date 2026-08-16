import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { broadcastMessage, generateCentrifugoToken } from "./service";
import type { WsMessage } from "$shared/dto/ws-message";

export const gatewayModule = new Elysia({ prefix: '/gateway', name: Modules.GATEWAY })
    .use(authMiddleware)
    .get("/token", async ({ query, user }) => {
        const token = await generateCentrifugoToken(user, query.deviceId);
        return { token };
    }, {
        query: t.Object({
            deviceId: t.String()
        }),
        auth: true
    })
    .get("/test", async ({ user }) => {
        const message: WsMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            payload: {
                type: "system",
                data: { message: `Test message for user ${user.id}` },
            },
        };
        await broadcastMessage([`user:${user.id}`], message);
        return { message: `Test message sent to user ${user.id}`, messageid: message.id };
    }, {
        auth: true
    });


