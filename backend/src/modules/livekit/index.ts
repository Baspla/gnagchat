import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { generateLiveKitToken } from "./service";
import { handleWebhookEvent } from "./webhook";

export const livekitModule = new Elysia({ prefix: '/livekit', name: Modules.LIVEKIT })
    .use(authMiddleware)
    .get("/token", async ({ query, user }) => {
        const roomName = query.roomName as string;
        const deviceId = query.deviceId as string;
        const token = await generateLiveKitToken(user, deviceId, roomName);
        return { token };
    }, {
        query: t.Object({
            roomName: t.String(),
            deviceId: t.String()
        }),
        auth: true
    })
    // Webhook endpoint — no auth middleware, validated by LiveKit JWT signature
    .post("/webhook", async ({ request }) => {
        const body = await request.text();
        const authHeader = request.headers.get("authorization") ?? "";
        const result = await handleWebhookEvent(body, authHeader);
        if (result.status === 401) {
            return new Response("Invalid webhook signature", { status: 401 });
        }
        return result.body;
    }, {
        // No auth: validated by WebhookReceiver
    });
