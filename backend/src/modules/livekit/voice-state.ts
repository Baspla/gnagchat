import type { DtoVoiceRoom, DtoVoiceParticipant, DtoVoiceTrack } from "$shared/dto/voice-room";

/**
 * In-memory store for LiveKit voice room state.
 * Mutable in shared module scope; survives only as long as the process.
 * On restart both the backend and LiveKit restart together, so this is sufficient.
 */
class VoiceRoomStateStore {
    private rooms = new Map<string, DtoVoiceRoom>();

    private ensureRoom(roomId: string, sid: string = ""): DtoVoiceRoom {
        const existing = this.rooms.get(roomId);
        if (existing) {
            if (sid && !existing.sid) {
                existing.sid = sid;
            }
            return existing;
        }

        const room: DtoVoiceRoom = {
            roomId,
            sid,
            participants: [],
            participantCount: 0,
        };
        this.rooms.set(roomId, room);
        return room;
    }

    get(roomId: string): DtoVoiceRoom | undefined {
        return this.rooms.get(roomId);
    }

    getAll(): ReadonlyMap<string, DtoVoiceRoom> {
        return this.rooms;
    }

    /**
     * Returns an array of voice states for a given set of room IDs.
     * Used to attach voice state to channel/DM listings.
     */
    getForRoomIds(roomIds: string[]): { roomId: string; state: DtoVoiceRoom }[] {
        const result: { roomId: string; state: DtoVoiceRoom }[] = [];
        for (const id of roomIds) {
            const state = this.rooms.get(id);
            if (state) {
                result.push({ roomId: id, state });
            }
        }
        return result;
    }

    // ── Mutators (called from webhook handler) ──────────────────────────

    roomStarted(roomId: string, sid: string): boolean {
        const room = this.rooms.get(roomId);
        if (room) {
            room.sid = sid;
            return false; // already tracked
        }
        this.rooms.set(roomId, {
            roomId,
            sid,
            participants: [],
            participantCount: 0,
        });
        return true;
    }

    roomFinished(roomId: string): boolean {
        return this.rooms.delete(roomId);
    }

    /**
     * Adds or updates a participant in a room.
     * Returns the userId if the participant was newly added, or undefined if already present.
     */
    participantJoined(roomId: string, identity: string, name: string, avatarUrl: string | null): string | undefined {
        const room = this.ensureRoom(roomId);

        const userId = identity.split(":")[0];
        const existing = room.participants.find((p) => p.identity === identity);
        if (existing) {
            // Update existing participant info
            existing.name = name;
            existing.avatarUrl = avatarUrl;
            return undefined;
        }

        room.participants.push({
            userId,
            name,
            avatarUrl,
            identity,
            tracks: [],
        });
        room.participantCount = room.participants.length;
        return userId;
    }

    /**
     * Removes a participant from a room.
     * Returns the room state if the room still has participants, or "empty" if the room should be removed.
     */
    participantLeft(roomId: string, identity: string): "deleted" | "updated" | undefined {
        const room = this.rooms.get(roomId);
        if (!room) {
            return undefined;
        }

        const idx = room.participants.findIndex((p) => p.identity === identity);
        if (idx === -1) {
            return undefined;
        }

        room.participants.splice(idx, 1);
        room.participantCount = room.participants.length;

        if (room.participants.length === 0) {
            this.rooms.delete(roomId);
            return "deleted";
        }
        return "updated";
    }

    trackPublished(roomId: string, identity: string, sid: string, kind: string, muted: boolean): boolean {
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }

        const participant = room.participants.find((p) => p.identity === identity);
        if (!participant) {
            return false;
        }

        const existing = participant.tracks.find((t) => t.sid === sid);
        if (existing) {
            existing.kind = kind;
            existing.muted = muted;
            return false;
        }

        participant.tracks.push({ sid, kind, muted });
        return true;
    }

    trackUnpublished(roomId: string, identity: string, sid: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }

        const participant = room.participants.find((p) => p.identity === identity);
        if (!participant) {
            return false;
        }

        const idx = participant.tracks.findIndex((t) => t.sid === sid);
        if (idx === -1) {
            return false;
        }

        participant.tracks.splice(idx, 1);
        return true;
    }
}

export const voiceStateStore = new VoiceRoomStateStore();