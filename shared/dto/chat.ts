import { t } from "elysia";
import { DtoVoiceRoomSchema } from "./voice-room";

export const DtoUserSchema = t.Object({
    id: t.String(),
    displayName: t.Optional(t.Nullable(t.String())),
    avatarUrl: t.Optional(t.Nullable(t.String())),
});

const BaseRoomProperties = {
    roomId: t.String(),
    createdAt: t.Date(),
    voiceState: t.Optional(t.Nullable(DtoVoiceRoomSchema)),
    displayName: t.Optional(t.Nullable(t.String())),
};

export const DtoChannelSchema = t.Object({
    ...BaseRoomProperties,
    type: t.Literal("channel" as const),
    name: t.String(),
});

export const DtoDMSchema = t.Object({
    ...BaseRoomProperties,
    type: t.Literal("dm" as const),
    recipient: DtoUserSchema,
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

const BaseChatMessage = {
    id: t.String(),
    roomId: t.String(),
    author: DtoUserSchema,
    content: t.String(),
    createdAt: t.Date(),
    editedAt: t.Optional(t.Nullable(t.Date())),
    mentions: t.Optional(t.Nullable(t.Array(DtoUserSchema))),
    emojis: t.Optional(t.Nullable(t.Array(DtoEmojiSchema))),
    //mention_roles
    //files
    reactions: t.Optional(t.Nullable(t.Array(DtoReactionSchema))),
    nonce: t.String(),
    pinned: t.Boolean(),
};

export const DtoTextChatMessage = t.Object({
    ...BaseChatMessage,
    type: t.Literal("text" as const),
});

export const DtoChatMessageSchema = t.Union([DtoTextChatMessage])
export const DtoRoomSchema = t.Union([DtoChannelSchema, DtoDMSchema]);

export type DtoUser = typeof DtoUserSchema.static;
export type DtoEmoji = typeof DtoEmojiSchema.static;
export type DtoReaction = typeof DtoReactionSchema.static;
export type DtoChatMessage = typeof DtoChatMessageSchema.static;
export type DtoRoom = typeof DtoRoomSchema.static;
export type DtoChannel = typeof DtoChannelSchema.static;
export type DtoDM = typeof DtoDMSchema.static;