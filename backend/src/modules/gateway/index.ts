import { Modules } from "$shared/constants";
import Elysia, { t } from "elysia";
import { authMiddleware } from "../auth";
import { generateCentrifugoToken } from "./service";

export const gatewayModule = new Elysia({ prefix: '/gateway', name: Modules.GATEWAY })
    .use(authMiddleware)
    .get("/token", async ({ query, user, status }) => {
        const result = await generateCentrifugoToken(user, query.deviceId);
        if (!result.ok) {
            return status(result.error.status, { error: result.error });
        }
        return { token: result.value };
    }, {
        query: t.Object({
            deviceId: t.String()
        }),
        auth: true
    });