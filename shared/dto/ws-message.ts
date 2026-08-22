import { t } from "elysia";
import { DtoChannelSchema, DtoChatMessageSchema, DtoEmojiSchema } from "./chat";
import { DtoVoiceRoomSchema } from "./voice-room";

// ── Per-event payload schemas ──────────────────────────────────────────

export const ChannelCreatePayloadSchema = DtoChannelSchema;
export type ChannelCreatePayload = typeof ChannelCreatePayloadSchema.static;

export const ChannelUpdatePayloadSchema = t.Object({
    channelId: t.String(),
});
export type ChannelUpdatePayload = typeof ChannelUpdatePayloadSchema.static;

export const ChannelDeletePayloadSchema = t.Object({
    channelId: t.String(),
});
export type ChannelDeletePayload = typeof ChannelDeletePayloadSchema.static;

export const ChannelPinsUpdatePayloadSchema = t.Object({
    channelId: t.String(),
});
export type ChannelPinsUpdatePayload = typeof ChannelPinsUpdatePayloadSchema.static;

export const ServerUpdatePayloadSchema = t.Object({
    serverId: t.String(),
});
export type ServerUpdatePayload = typeof ServerUpdatePayloadSchema.static;

export const EmojiUpdatePayloadSchema = t.Object({
    serverId: t.String(),
});
export type EmojiUpdatePayload = typeof EmojiUpdatePayloadSchema.static;

export const MemberAddPayloadSchema = t.Object({
    serverId: t.String(),
    userId: t.String(),
});
export type MemberAddPayload = typeof MemberAddPayloadSchema.static;

export const MemberRemovePayloadSchema = t.Object({
    serverId: t.String(),
    userId: t.String(),
});
export type MemberRemovePayload = typeof MemberRemovePayloadSchema.static;

export const MemberUpdatePayloadSchema = t.Object({
    serverId: t.String(),
    userId: t.String(),
});
export type MemberUpdatePayload = typeof MemberUpdatePayloadSchema.static;

export const RoleCreatePayloadSchema = t.Object({
    roleId: t.String(),
});
export type RoleCreatePayload = typeof RoleCreatePayloadSchema.static;

export const RoleUpdatePayloadSchema = t.Object({
    roleId: t.String(),
});
export type RoleUpdatePayload = typeof RoleUpdatePayloadSchema.static;

export const RoleDeletePayloadSchema = t.Object({
    roleId: t.String(),
});
export type RoleDeletePayload = typeof RoleDeletePayloadSchema.static;

export const MessageCreatePayloadSchema = DtoChatMessageSchema;
export type MessageCreatePayload = typeof MessageCreatePayloadSchema.static;

export const MessageUpdatePayloadSchema = t.Object({
    messageId: t.String(),
    roomId: t.String(),
});
export type MessageUpdatePayload = typeof MessageUpdatePayloadSchema.static;

export const MessageDeletePayloadSchema = t.Object({
    messageId: t.String(),
    roomId: t.String(),
});
export type MessageDeletePayload = typeof MessageDeletePayloadSchema.static;

export const MessageDeleteBulkPayloadSchema = t.Object({
    messageIds: t.Array(t.String()),
    roomId: t.String(),
});
export type MessageDeleteBulkPayload = typeof MessageDeleteBulkPayloadSchema.static;

export const MessageReactionAddPayloadSchema = t.Object({
    messageId: t.String(),
    roomId: t.String(),
    emoji: DtoEmojiSchema,
    userId: t.String(),
});
export type MessageReactionAddPayload = typeof MessageReactionAddPayloadSchema.static;

export const MessageReactionRemovePayloadSchema = t.Object({
    messageId: t.String(),
    roomId: t.String(),
    emoji: DtoEmojiSchema,
    userId: t.String(),
});
export type MessageReactionRemovePayload = typeof MessageReactionRemovePayloadSchema.static;

export const MessageReactionRemoveAllPayloadSchema = t.Object({
    messageId: t.String(),
    roomId: t.String(),
});
export type MessageReactionRemoveAllPayload = typeof MessageReactionRemoveAllPayloadSchema.static;

export const MessageReactionRemoveEmojiPayloadSchema = t.Object({
    messageId: t.String(),
    roomId: t.String(),
    emoji: DtoEmojiSchema,
});
export type MessageReactionRemoveEmojiPayload = typeof MessageReactionRemoveEmojiPayloadSchema.static;

export const PresenceUpdatePayloadSchema = t.Object({
    userId: t.String(),
    status: t.String(),
});
export type PresenceUpdatePayload = typeof PresenceUpdatePayloadSchema.static;

export const TypingStartPayloadSchema = t.Object({
    roomId: t.String(),
    userId: t.String(),
});
export type TypingStartPayload = typeof TypingStartPayloadSchema.static;

export const VoiceStateUpdatePayloadSchema = t.Object({
    roomId: t.String(),
    userId: t.String(),
    channelId: t.Optional(t.String()),
});
export type VoiceStateUpdatePayload = typeof VoiceStateUpdatePayloadSchema.static;

export const SystemMessagePayloadSchema = t.Object({
    message: t.String(),
});
export type SystemMessagePayload = typeof SystemMessagePayloadSchema.static;

export const ErrorMessagePayloadSchema = t.Object({
    message: t.String(),
});
export type ErrorMessagePayload = typeof ErrorMessagePayloadSchema.static;

export const VoiceRoomUpdatePayloadSchema = DtoVoiceRoomSchema;
export type VoiceRoomUpdatePayload = typeof VoiceRoomUpdatePayloadSchema.static;

// ── Discriminated union of all event variants ──────────────────────────

export const WsEventSchema = t.Union([
    t.Object({ type: t.Literal("channel_create"), data: ChannelCreatePayloadSchema }),
    t.Object({ type: t.Literal("channel_update"), data: ChannelUpdatePayloadSchema }),
    t.Object({ type: t.Literal("channel_delete"), data: ChannelDeletePayloadSchema }),
    t.Object({ type: t.Literal("channel_pins_update"), data: ChannelPinsUpdatePayloadSchema }),
    t.Object({ type: t.Literal("server_update"), data: ServerUpdatePayloadSchema }),
    t.Object({ type: t.Literal("emoji_update"), data: EmojiUpdatePayloadSchema }),
    t.Object({ type: t.Literal("member_add"), data: MemberAddPayloadSchema }),
    t.Object({ type: t.Literal("member_remove"), data: MemberRemovePayloadSchema }),
    t.Object({ type: t.Literal("member_update"), data: MemberUpdatePayloadSchema }),
    t.Object({ type: t.Literal("role_create"), data: RoleCreatePayloadSchema }),
    t.Object({ type: t.Literal("role_update"), data: RoleUpdatePayloadSchema }),
    t.Object({ type: t.Literal("role_delete"), data: RoleDeletePayloadSchema }),
    t.Object({ type: t.Literal("message_create"), data: MessageCreatePayloadSchema }),
    t.Object({ type: t.Literal("message_update"), data: MessageUpdatePayloadSchema }),
    t.Object({ type: t.Literal("message_delete"), data: MessageDeletePayloadSchema }),
    t.Object({ type: t.Literal("message_delete_bulk"), data: MessageDeleteBulkPayloadSchema }),
    t.Object({ type: t.Literal("message_reaction_add"), data: MessageReactionAddPayloadSchema }),
    t.Object({ type: t.Literal("message_reaction_remove"), data: MessageReactionRemovePayloadSchema }),
    t.Object({ type: t.Literal("message_reaction_remove_all"), data: MessageReactionRemoveAllPayloadSchema }),
    t.Object({ type: t.Literal("message_reaction_remove_emoji"), data: MessageReactionRemoveEmojiPayloadSchema }),
    t.Object({ type: t.Literal("presence_update"), data: PresenceUpdatePayloadSchema }),
    t.Object({ type: t.Literal("typing_start"), data: TypingStartPayloadSchema }),
    t.Object({ type: t.Literal("voice_state_update"), data: VoiceStateUpdatePayloadSchema }),
    t.Object({ type: t.Literal("voice_room_update"), data: VoiceRoomUpdatePayloadSchema }),
    t.Object({ type: t.Literal("system"), data: SystemMessagePayloadSchema }),
    t.Object({ type: t.Literal("error"), data: ErrorMessagePayloadSchema }),
]);
export type WsEvent = typeof WsEventSchema.static;

// ── Root envelope ────────────────────────────────────────────────────────

export const WsMessageSchema = t.Object({
    id: t.String(),
    timestamp: t.String(),
    nonce: t.Optional(t.String()),
    payload: WsEventSchema,
});
export type WsMessage = typeof WsMessageSchema.static;