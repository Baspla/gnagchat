import { WebhookReceiver } from "livekit-server-sdk";
import { voiceStateStore } from "./voice-state";
import { broadcastMessage } from "../gateway/service";
import type { DtoVoiceRoom } from "$shared/dto/voice-room";
import type { WsMessage } from "$shared/dto/ws-message";
import { env } from "../../env";
import { db } from "../../db";
import { user } from "../user/schema";
import { inArray } from "drizzle-orm";
import { ChatService } from "../chat/service";

const receiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

/**
 * Maps a LiveKit track kind to our simplified "audio" | "video" | "screen" kind.
 */
function mapTrackKind(kind: string): string {
    switch (kind) {
        case "audio":
            return "audio";
        case "video":
            return "video";
        case "screen_share":
        case "screen_share_audio":
            return "screen";
        default:
            return kind;
    }
}

/**
 * Publish a voice_room_update event to all members of a room.
 */
async function broadcastVoiceUpdate(roomId: string) {
    const state = voiceStateStore.get(roomId);
    if (!state) {
        // Room was deleted (last participant left) — broadcast empty state
        const emptyState: DtoVoiceRoom = {
            roomId,
            sid: "",
            participants: [],
            participantCount: 0,
        };
        const memberIds = await ChatService.getRoomMemberIdsAsSystem(roomId);
        const wsMessage: WsMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            payload: {
                type: "voice_room_update",
                data: emptyState,
            },
        };
        broadcastMessage(memberIds.map((id) => `user:${id}`), wsMessage);
        return;
    }

    // Look up user names and avatars for each participant
    const userIds = state.participants.map((p) => p.userId);
    const userMap = new Map<string, { name: string | null; image: string | null }>();
    if (userIds.length > 0) {
        const users = await db
            .select({ id: user.id, name: user.name, image: user.image })
            .from(user)
            .where(inArray(user.id, userIds));
        for (const u of users) {
            userMap.set(u.id, { name: u.name, image: u.image });
        }
    }

    const enrichedState: DtoVoiceRoom = {
        ...state,
        participants: state.participants.map((p) => {
            const u = userMap.get(p.userId);
            return {
                ...p,
                name: u?.name ?? p.name,
                avatarUrl: u?.image ?? p.avatarUrl,
            };
        }),
    };

    const memberIds = await ChatService.getRoomMemberIdsAsSystem(roomId);
    const wsMessage: WsMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
            type: "voice_room_update",
            data: enrichedState,
        },
    };
    broadcastMessage(memberIds.map((id) => `user:${id}`), wsMessage);
}

/**
 * Handles an incoming webhook event from LiveKit.
 * Returns 200 OK to acknowledge receipt.
 */
export async function handleWebhookEvent(body: string, authHeader: string): Promise<{ status: number; body: string }> {
    try {
        const event = await receiver.receive(body, authHeader);
        const { event: eventName } = event;

        console.log(`Received LiveKit webhook event: ${eventName} for room: ${event.room?.name}`);

        // Extract room name (which is our chat room ID)
        const roomName = event.room?.name;
        if (!roomName) {
            return { status: 200, body: "OK" };
        }

        switch (eventName) {
            case "room_started": {
                const sid = event.room?.sid ?? "";
                voiceStateStore.roomStarted(roomName, sid);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            case "room_finished": {
                voiceStateStore.roomFinished(roomName);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            case "participant_joined": {
                const identity = event.participant?.identity ?? "";
                const name = event.participant?.name ?? identity;
                const avatarUrl = event.participant?.attributes?.image ?? null;
                voiceStateStore.participantJoined(roomName, identity, name, avatarUrl);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            case "participant_left": {
                const identity = event.participant?.identity ?? "";
                voiceStateStore.participantLeft(roomName, identity);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            case "participant_connection_aborted": {
                const identity = event.participant?.identity ?? "";
                voiceStateStore.participantLeft(roomName, identity);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            case "track_published": {
                const identity = event.participant?.identity ?? "";
                const trackSid = event.track?.sid ?? "";
                const trackKind = mapTrackKind(String(event.track?.type ?? ""));
                const muted = event.track?.muted ?? false;
                voiceStateStore.trackPublished(roomName, identity, trackSid, trackKind, muted);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            case "track_unpublished": {
                const identity = event.participant?.identity ?? "";
                const trackSid = event.track?.sid ?? "";
                voiceStateStore.trackUnpublished(roomName, identity, trackSid);
                await broadcastVoiceUpdate(roomName);
                break;
            }

            default:
                // Ignore other events (egress, ingress, etc.)
                break;
        }

        return { status: 200, body: "OK" };
    } catch (error: any) {
        console.error("Webhook handler error:", error);
        return { status: 401, body: "Unauthorized" };
    }
}