import { ReactiveRoom } from "$lib/livekit.svelte";
import { ConnectionState } from "livekit-client";
import { createLogger } from "$lib/logger";
import { api } from "$lib/api";

const logger = createLogger("voice-room-manager");

export enum VoiceState {
    Unmuted = "unmuted",
    Muted = "muted",
    Deafened = "deafened",
    DeafenedAndMuted = "deafenedandmuted",
}

export class VoiceRoomManager {
    room = $state<ReactiveRoom>(new ReactiveRoom({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
    }));

    currentRoomId = $state<string>("");
    currentRoomDisplayName = $state<string>("");

    voiceState = $state<VoiceState>(VoiceState.Unmuted);

    // Derived state for convenience
    get roomDisplayName() {
        return this.currentRoomDisplayName || this.currentRoomId;
    }

    get state() {
        return this.room.state;
    }

    get localParticipant() {
        return this.room.localParticipant;
    }

    get allParticipants() {
        return this.room.allParticipants;
    }

    get remoteParticipants() {
        return this.room.remoteParticipants;
    }

    get activeSpeakers() {
        return this.room.activeSpeakers;
    }

    get isConnected() {
        return this.room.state === ConnectionState.Connected;
    }

    get isConnecting() {
        return this.room.state === ConnectionState.Connecting;
    }

    get canSpeak(): boolean {
        return this.voiceState === VoiceState.Unmuted;
    }

    get canHear(): boolean {
        return this.voiceState === VoiceState.Unmuted
            || this.voiceState === VoiceState.Muted;
    }

    async joinRoom(roomId: string, displayName: string) {
        if (this.currentRoomId === roomId && this.isConnected) {
            return; // Already in this room
        }

        // If already connected to a different room, disconnect first
        if (this.isConnected && this.currentRoomId !== roomId) {
            await this.leaveRoom();
        }

        this.currentRoomDisplayName = displayName;
        this.currentRoomId = roomId;
        await this.room.prepareConnection(roomId);
        await this.room.connect(roomId);
        await this.syncAudioState();
    }

    async leaveRoom() {
        if (this.room.state !== ConnectionState.Disconnected) {
            await this.room.disconnect();
        }
        this.currentRoomId = "";
        this.currentRoomDisplayName = "";
    }

    async toggleMute() {
        switch (this.voiceState) {
            case VoiceState.Unmuted:
                this.voiceState = VoiceState.Muted;
                break;
            case VoiceState.Muted:
                this.voiceState = VoiceState.Unmuted;
                break;
            case VoiceState.Deafened:
                this.voiceState = VoiceState.Unmuted;
                break;
            case VoiceState.DeafenedAndMuted:
                this.voiceState = VoiceState.Unmuted;
                break;
        }
        await this.syncAudioState();
    }

    async toggleDeafen() {
        switch (this.voiceState) {
            case VoiceState.Unmuted:
                this.voiceState = VoiceState.Deafened;
                break;
            case VoiceState.Muted:
                this.voiceState = VoiceState.DeafenedAndMuted;
                break;
            case VoiceState.Deafened:
                this.voiceState = VoiceState.Unmuted;
                break;
            case VoiceState.DeafenedAndMuted:
                this.voiceState = VoiceState.Muted;
                break;
        }
        await this.syncAudioState();
    }

    private async syncAudioState() {
        try {
            if (this.room.localParticipant) {
                await this.room.localParticipant.setMicrophoneEnabled(
                    this.canSpeak,
                    {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                );
            }
        } catch (error) {
            logger.error("error syncing audio state", { error: String(error) });
        }
    }

    async toggleCamera() {
        try {
            if (this.room.localParticipant) {
                await this.room.localParticipant.setCameraEnabled(
                    !this.room.localParticipant.isCameraEnabled,
                );
            }
        } catch (error) {
            logger.error("error toggling camera", { error: String(error) });
        }
    }

    async toggleScreenShare() {
        try {
            if (this.room.localParticipant) {
                await this.room.localParticipant.setScreenShareEnabled(
                    !this.room.localParticipant.isScreenShareEnabled,
                    {
                        audio: true,
                        contentHint: "detail",
                    },
                );
            }
        } catch (error) {
            logger.error("error toggling screen share", { error: String(error) });
        }
    }

    destroy() {
        this.room.disconnect();
        this.room.destroy();
    }
}
