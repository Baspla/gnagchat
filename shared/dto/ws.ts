import { t } from "elysia";
import { ChatMessageSchema } from "./chat";

export const ServerWsMessageSchema = t.Union([
    t.Object({ type: t.Literal("chat_message"), data: ChatMessageSchema }),
    t.Object({ type: t.Literal("typing_indicator"), userId: t.String(), isTyping: t.Boolean() }),
    t.Object({ type: t.Literal("system"), message: t.String() }),
    t.Object({ type: t.Literal("pong") }),
    t.Object({ type: t.Literal("error"), message: t.String() }),
    t.Object({ type: t.Literal("room_activity"), roomId: t.String(), message: ChatMessageSchema }),
]);

export type ServerWsMessage = typeof ServerWsMessageSchema.static;

export const ClientWsMessageSchema = t.Union([
    t.Object({ type: t.Literal("ping") }),
    t.Object({ type: t.Literal("subscribe"), topic: t.String() }),
    t.Object({ type: t.Literal("unsubscribe"), topic: t.String() }),
    t.Object({ type: t.Literal("typing"), roomId: t.String(), isTyping: t.Boolean() }),
]);

export type ClientWsMessage = typeof ClientWsMessageSchema.static;