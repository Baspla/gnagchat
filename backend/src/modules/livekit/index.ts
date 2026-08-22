import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { generateLiveKitToken } from "./service";
import { handleWebhookEvent } from "./webhook";

export const livekitModule = new Elysia({ prefix: '/livekit', name: Modules.LIVEKIT })
    .use(authMiddleware)
    .get("/token", async ({ query, user, status }) => {
        const result = await generateLiveKitToken(user, query.deviceId, query.roomName);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return { token: result.value };
    }, {
        query: t.Object({
            roomName: t.String(),
            deviceId: t.String()
        }),
        auth: true
    })
    // Webhook endpoint — no auth middleware, validated by LiveKit JWT signature
    .post("/webhook", async ({ request, status }) => {
        const body = await request.text();
        const authHeader = request.headers.get("authorization") ?? "";
        const result = await handleWebhookEvent(body, authHeader);
        if (!result.ok) {
            return status(result.error.status, result.error.message);
        }
        return result.value;
    }, {
        // No auth: validated by WebhookReceiver
    });