import type { DtoVoiceRoom, DtoVoiceUser, DtoVoiceDevice, DtoVoiceTrack } from "$shared/dto/voice-room";

/**
 * In-memory store for LiveKit voice room state.
 * Mutable in shared module scope; survives only as long as the process.
 * On restart both the backend and LiveKit restart together, so this is sufficient.
 *
 * Each LiveKit identity is "userId:deviceId". Multiple devices from the same user
 * are grouped under a single DtoVoiceUser entry with a devices[] array.
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
            users: [],
            userCount: 0,
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
            users: [],
            userCount: 0,
        });
        return true;
    }

    roomFinished(roomId: string): boolean {
        return this.rooms.delete(roomId);
    }

    /**
     * Adds or updates a device for a user in a room.
     * Returns the userId if the user was newly added, or undefined if already present.
     */
    participantJoined(roomId: string, identity: string, name: string, avatarUrl: string | null): string | undefined {
        const room = this.ensureRoom(roomId);
        const userId = identity.split(":")[0];

        let user = room.users.find((u) => u.userId === userId);
        if (user) {
            // Update user info
            user.name = name;
            user.avatarUrl = avatarUrl;

            // Add or update device
            const existingDevice = user.devices.find((d) => d.identity === identity);
            if (!existingDevice) {
                user.devices.push({ identity, tracks: [] });
            }
            return undefined;
        }

        // New user with one device
        room.users.push({
            userId,
            name,
            avatarUrl,
            devices: [{ identity, tracks: [] }],
        });
        room.userCount = room.users.length;
        return userId;
    }

    /**
     * Removes a device from a user in a room.
     * If the user has no more devices, the user is removed.
     * Returns "deleted" if the room becomes empty, "updated" if still has users, or undefined if not found.
     */
    participantLeft(roomId: string, identity: string): "deleted" | "updated" | undefined {
        const room = this.rooms.get(roomId);
        if (!room) {
            return undefined;
        }

        const userId = identity.split(":")[0];
        const userIdx = room.users.findIndex((u) => u.userId === userId);
        if (userIdx === -1) {
            return undefined;
        }

        const user = room.users[userIdx];
        const deviceIdx = user.devices.findIndex((d) => d.identity === identity);
        if (deviceIdx === -1) {
            return undefined;
        }

        user.devices.splice(deviceIdx, 1);

        // If user has no more devices, remove the user
        if (user.devices.length === 0) {
            room.users.splice(userIdx, 1);
            room.userCount = room.users.length;
        }

        if (room.users.length === 0) {
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

        const userId = identity.split(":")[0];
        const user = room.users.find((u) => u.userId === userId);
        if (!user) {
            return false;
        }

        const device = user.devices.find((d) => d.identity === identity);
        if (!device) {
            return false;
        }

        const existing = device.tracks.find((t) => t.sid === sid);
        if (existing) {
            existing.kind = kind;
            existing.muted = muted;
            return false;
        }

        device.tracks.push({ sid, kind, muted });
        return true;
    }

    trackUnpublished(roomId: string, identity: string, sid: string): boolean {
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }

        const userId = identity.split(":")[0];
        const user = room.users.find((u) => u.userId === userId);
        if (!user) {
            return false;
        }

        const device = user.devices.find((d) => d.identity === identity);
        if (!device) {
            return false;
        }

        const idx = device.tracks.findIndex((t) => t.sid === sid);
        if (idx === -1) {
            return false;
        }

        device.tracks.splice(idx, 1);
        return true;
    }
}

export const voiceStateStore = new VoiceRoomStateStore();