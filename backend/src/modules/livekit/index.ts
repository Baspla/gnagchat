import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { generateLiveKitToken } from "./service";
import { handleWebhookEvent } from "./webhook";

export const livekitModule = new Elysia({ prefix: '/livekit', name: Modules.LIVEKIT })
    .use(authMiddleware)
    .get("/token", async ({ query, user, status }) => {
        try {
            const roomName = query.roomName as string;
            const deviceId = query.deviceId as string;
            const token = await generateLiveKitToken(user, deviceId, roomName);
            return { token };
        } catch (e: any) {
            return status('Internal Server Error', e.message || 'Failed to generate LiveKit token');
        }
    }, {
        query: t.Object({
            roomName: t.String(),
            deviceId: t.String()
        }),
        auth: true
    })
    // Webhook endpoint — no auth middleware, validated by LiveKit JWT signature
    .post("/webhook", async ({ request, status }) => {
        try {
            const body = await request.text();
            const authHeader = request.headers.get("authorization") ?? "";
            const result = await handleWebhookEvent(body, authHeader);
            if (result.status === 401) {
                return status("Unauthorized", "Invalid webhook signature");
            }
            return result.body;
        } catch (e: any) {
            console.error("Webhook endpoint error:", e);
            return status("Internal Server Error", "Failed to process webhook");
        }
    }, {
        // No auth: validated by WebhookReceiver
    });
