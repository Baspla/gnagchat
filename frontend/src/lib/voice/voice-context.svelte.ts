import { getContext, setContext } from "svelte";
import type { VoiceRoomManager } from "./voice-room-manager.svelte";

const VOICE_ROOM_KEY = Symbol("voice-room");

export function setVoiceRoom(manager: VoiceRoomManager): void {
    setContext(VOICE_ROOM_KEY, manager);
}

export function getVoiceRoom(): VoiceRoomManager {
    const manager = getContext<VoiceRoomManager>(VOICE_ROOM_KEY);
    if (!manager) {
        throw new Error(
            "VoiceRoomManager not found in context. Make sure to wrap your component tree in a <VoiceProvider>.",
        );
    }
    return manager;
}