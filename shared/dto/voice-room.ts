import { t } from "elysia";

export const DtoVoiceTrackSchema = t.Object({
    sid: t.String(),
    kind: t.String(), // "audio" | "video" | "screen"
    muted: t.Boolean(),
});
export type DtoVoiceTrack = typeof DtoVoiceTrackSchema.static;

export const DtoVoiceParticipantSchema = t.Object({
    userId: t.String(),
    name: t.String(),
    avatarUrl: t.Optional(t.Nullable(t.String())),
    identity: t.String(),
    tracks: t.Array(DtoVoiceTrackSchema),
});
export type DtoVoiceParticipant = typeof DtoVoiceParticipantSchema.static;

export const DtoVoiceRoomSchema = t.Object({
    roomId: t.String(),
    sid: t.String(),
    participants: t.Array(DtoVoiceParticipantSchema),
    participantCount: t.Number(),
});
export type DtoVoiceRoom = typeof DtoVoiceRoomSchema.static;