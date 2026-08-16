import { ReactiveRoom } from "$lib/livekit.svelte";
import { ConnectionState } from "livekit-client";
import { createLogger } from "$lib/logger";

const logger = createLogger("voice-room-manager");

export class VoiceRoomManager {
    room = $state<ReactiveRoom>(new ReactiveRoom({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
    }));

    currentRoomName = $state<string>("");
    currentRoomDisplayName = $state<string>("");

    // Derived state for convenience
    get roomDisplayName() {
        return this.currentRoomDisplayName || this.currentRoomName;
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

    async joinRoom(roomName: string, displayName?: string) {
        if (this.currentRoomName === roomName && this.isConnected) {
            return; // Already in this room
        }

        // If already connected to a different room, disconnect first
        if (this.isConnected && this.currentRoomName !== roomName) {
            await this.leaveRoom();
        }

        this.currentRoomName = roomName;
        this.currentRoomDisplayName = displayName ?? roomName;
        await this.room.prepareConnection(roomName);
        await this.room.connect(roomName);
        await this.room.localParticipant?.setMicrophoneEnabled(true);
    }

    async leaveRoom() {
        if (this.room.state !== ConnectionState.Disconnected) {
            await this.room.disconnect();
        }
        this.currentRoomName = "";
        this.currentRoomDisplayName = "";
    }

    async switchRoom(roomName: string) {
        await this.joinRoom(roomName);
    }

    async toggleMute() {
        try {
            if (this.room.localParticipant) {
                await this.room.localParticipant.setMicrophoneEnabled(
                    !this.room.localParticipant.isMicrophoneEnabled,
                    {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                );
            }
        } catch (error) {
            logger.error("error toggling mute", { error: String(error) });
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