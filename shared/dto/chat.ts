import { t } from "elysia";

export const DtoRoomSchema = t.Object({
    id: t.String(),
});

export const DtoChannelSchema = t.Object({
    name: t.String(),
    roomId: t.String(),
    createdAt: t.Date(),
});

export const DtoUserSchema = t.Object({
    id: t.String(),
    displayName: t.Optional(t.Nullable(t.String())),
    avatarUrl: t.Optional(t.Nullable(t.String())),
});

export const DtoEmojiSchema = t.Object({
    id: t.String(),
    name: t.Optional(t.Nullable(t.String())),
    custom: t.Boolean(),
});

export const DtoReactionSchema = t.Object({
    emoji: DtoEmojiSchema,
    count: t.Number(),
});

export const DtoChatMessageSchema = t.Object({
    id: t.String(),
    roomId: t.String(),
    author: DtoUserSchema,
    content: t.String(),
    createdAt: t.Date(),
    editedAt: t.Optional(t.Nullable(t.Date())),
    mentions: t.Optional(t.Nullable(t.Array(DtoUserSchema))),
    emojis: t.Optional(t.Nullable(t.Array(DtoEmojiSchema))),
    //mention_roles
    reactions: t.Optional(t.Nullable(t.Array(DtoReactionSchema))),
    nonce: t.String(),
    pinned: t.Boolean(),
    type: t.Literal("text" as const),
});

export type DtoUser = typeof DtoUserSchema.static;
export type DtoEmoji = typeof DtoEmojiSchema.static;
export type DtoReaction = typeof DtoReactionSchema.static;
export type DtoChatMessage = typeof DtoChatMessageSchema.static;
export type DtoRoom = typeof DtoRoomSchema.static;
export type DtoChannel = typeof DtoChannelSchema.static;