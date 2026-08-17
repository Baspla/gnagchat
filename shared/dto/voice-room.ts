import { t } from "elysia";

export const DtoVoiceTrackSchema = t.Object({
    sid: t.String(),
    kind: t.String(), // "audio" | "video" | "screen"
    muted: t.Boolean(),
});
export type DtoVoiceTrack = typeof DtoVoiceTrackSchema.static;

export const DtoVoiceDeviceSchema = t.Object({
    identity: t.String(), // "userId:deviceId"
    tracks: t.Array(DtoVoiceTrackSchema),
});
export type DtoVoiceDevice = typeof DtoVoiceDeviceSchema.static;

export const DtoVoiceUserSchema = t.Object({
    userId: t.String(),
    name: t.String(),
    avatarUrl: t.Optional(t.Nullable(t.String())),
    devices: t.Array(DtoVoiceDeviceSchema),
});
export type DtoVoiceUser = typeof DtoVoiceUserSchema.static;

export const DtoVoiceRoomSchema = t.Object({
    // The unique identifier for the voice room
    roomId: t.String(),
    // The unique identifier for the voice room session
    sid: t.String(),
    users: t.Array(DtoVoiceUserSchema),
    userCount: t.Number(),
});
export type DtoVoiceRoom = typeof DtoVoiceRoomSchema.static;