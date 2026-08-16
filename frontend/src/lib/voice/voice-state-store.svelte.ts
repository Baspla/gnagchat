import type { DtoVoiceRoom } from "$shared/dto/voice-room";
import { getGatewayManager } from "$lib/gateway/gateway-context.svelte";

/**
 * Reactive store that tracks LiveKit voice room state.
 * Updated via Centrifugo voice_room_update events.
 */
class VoiceStateStore {
    #rooms = $state<Map<string, DtoVoiceRoom>>(new Map());
    #unsub: (() => void) | null = null;

    /**
     * Initialize the store: subscribe to gateway events.
     * Call this once from a root layout or component.
     */
    init() {
        if (this.#unsub) return; // already initialized
        const gw = getGatewayManager();
        this.#unsub = gw.on("voice_room_update", (data) => {
            const room = data as DtoVoiceRoom;
            if (room.userCount === 0) {
                // Room is empty — remove from map
                this.#rooms.delete(room.roomId);
            } else {
                this.#rooms.set(room.roomId, room);
            }
            // Trigger reactivity by reassigning
            this.#rooms = new Map(this.#rooms);
        });
    }

    /**
     * Cleanup subscriptions.
     */
    destroy() {
        this.#unsub?.();
        this.#unsub = null;
        this.#rooms = new Map();
    }

    /**
     * Seed the store with initial voice room data from the API response.
     * This ensures the store has data immediately on first render
     * before any live events arrive.
     */
    seed(room: DtoVoiceRoom) {
        this.#rooms.set(room.roomId, room);
        this.#rooms = new Map(this.#rooms);
    }

    /**
     * Get voice state for a specific room.
     */
    get(roomId: string): DtoVoiceRoom | undefined {
        return this.#rooms.get(roomId);
    }

    /**
     * Check if a room has an active voice session.
     */
    hasActiveRoom(roomId: string): boolean {
        const room = this.#rooms.get(roomId);
        return room !== undefined && room.userCount > 0;
    }

    /**
     * Get all active voice rooms.
     */
    get allRooms(): ReadonlyMap<string, DtoVoiceRoom> {
        return this.#rooms;
    }

    /**
     * Get participant count for a room.
     */
    userCount(roomId: string): number {
        return this.#rooms.get(roomId)?.userCount ?? 0;
    }

    /**
     * Get participant names for a room.
     */
    userNames(roomId: string): string[] {
        const room = this.#rooms.get(roomId);
        if (!room) return [];
        return room.users.map((u) => u.name);
    }
}

export const voiceStateStore = new VoiceStateStore();