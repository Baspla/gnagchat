import { t } from "elysia";
import { ChatMessageSchema } from "./chat";

export const WSIncomingMessageSchema = t.Union([
    t.Object({ type: t.Literal("chat_message"), data: ChatMessageSchema }),
    t.Object({ type: t.Literal("typing_indicator"), userId: t.String(), isTyping: t.Boolean() }),
    t.Object({ type: t.Literal("system"), message: t.String() }),
    t.Object({ type: t.Literal("pong") }),
    t.Object({ type: t.Literal("error"), message: t.String() }),
    t.Object({ type: t.Literal("room_activity"), roomId: t.String(), message: ChatMessageSchema }),
]);

export type WSIncomingMessage = typeof WSIncomingMessageSchema.static;