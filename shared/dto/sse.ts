import { t } from "elysia";
import { DtoChatMessageSchema } from "./chat";

/**
 * SSE event payloads sent down the unified gateway stream.
 * The `event` field discriminates the type; `data` carries the payload.
 */
export const SseEventSchema = t.Union([
    t.Object({
        event: t.Literal("message_created"),
        data: DtoChatMessageSchema,
    }),
    t.Object({
        event: t.Literal("typing_indicator"),
        data: t.Object({
            roomId: t.String(),
            userId: t.String(),
            isTyping: t.Boolean(),
        }),
    }),
    t.Object({
        event: t.Literal("user_joined"),
        data: t.Object({
            roomId: t.String(),
            userId: t.String(),
        }),
    }),
    t.Object({
        event: t.Literal("user_left"),
        data: t.Object({
            roomId: t.String(),
            userId: t.String(),
        }),
    }),
    t.Object({
        event: t.Literal("channel_deleted"),
        data: t.Object({
            roomId: t.String(),
        }),
    }),
    t.Object({
        event: t.Literal("system"),
        data: t.Object({
            message: t.String(),
        }),
    }),
    t.Object({
        event: t.Literal("error"),
        data: t.Object({
            message: t.String(),
        }),
    }),
]);

export type SseEvent = typeof SseEventSchema.static;