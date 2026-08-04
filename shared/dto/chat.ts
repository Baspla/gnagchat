import { t } from "elysia";

export const ChatMessageSchema = t.Object({
    id: t.String(),
    roomId: t.String(),
    userId: t.String(),
    content: t.String(),
    createdAt: t.Date(),
});

export type ChatMessage = typeof ChatMessageSchema.static;