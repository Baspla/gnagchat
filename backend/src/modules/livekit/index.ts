import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { generateLiveKitToken } from "./service";

export const livekitModule = new Elysia({ prefix: '/livekit', name: Modules.LIVEKIT })
    .use(authMiddleware)
    .get("/token", async ({ query, user, status }) => {
        try {
            const roomName = query.roomName as string;
            const deviceId = query.deviceId as string;
            const token = await generateLiveKitToken(user.id, deviceId, user.name, roomName);
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
    });
