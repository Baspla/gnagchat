import { WebhookEvent, WebhookReceiver } from "livekit-server-sdk";
import { voiceStateStore } from "./voice-state";
import { broadcastMessage } from "../gateway/service";
import type { DtoVoiceRoom, DtoVoiceUser } from "$shared/dto/voice-room";
import type { WsMessage } from "$shared/dto/ws-message";
import { env } from "../../env";
import { db } from "../../db";
import { user } from "../user/schema";
import { inArray } from "drizzle-orm";
import { ChatService } from "../chat/service";
import { createLogger } from "../../lib/logger";
import { ok, err, type Result, type UnauthorizedError, type InternalError } from "../../lib/result";

const logger = createLogger('livekit-webhook');
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
 * If the room does not exist in the database (e.g. it was deleted while
 * LiveKit still had it), the broadcast is silently skipped.
 */
async function broadcastVoiceUpdate(roomId: string) {
    // Resolve member IDs — if the room doesn't exist in the DB there is
    // nobody to broadcast to, so we skip gracefully.
    const membersResult = await ChatService.getRoomMemberIdsAsSystem(roomId);
    if (!membersResult.ok) {
        logger.warn('broadcastVoiceUpdate: room not found, skipping', { roomId });
        return;
    }
    const memberIds = membersResult.value;

    const state = voiceStateStore.get(roomId);
    if (!state) {
        // Room was deleted (last participant left) — broadcast empty state
        const emptyState: DtoVoiceRoom = {
            roomId,
            sid: "",
            users: [],
            userCount: 0,
        };
        const wsMessage: WsMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            payload: {
                type: "voice_room_update",
                data: emptyState,
            },
        };
        await broadcastMessage(memberIds.map((id) => `user:${id}`), wsMessage);
        return;
    }

    // Look up user names and avatars for each user
    const userIds = state.users.map((u) => u.userId);
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
        users: state.users.map((user) => {
            const u = userMap.get(user.userId);
            return {
                ...user,
                name: u?.name ?? user.name,
                avatarUrl: u?.image ?? user.avatarUrl,
            };
        }),
    };

    const wsMessage: WsMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
            type: "voice_room_update",
            data: enrichedState,
        },
    };
    const broadcast = await broadcastMessage(memberIds.map((id) => `user:${id}`), wsMessage);
    if (!broadcast.ok) {
        logger.error('failed to broadcast voice room update', { roomId, error: broadcast.error.message });
    }
}

/**
 * Handles an incoming webhook event from LiveKit.
 * Returns ok("OK") to acknowledge receipt.
 */
export async function handleWebhookEvent(body: string, authHeader: string): Promise<Result<"OK", UnauthorizedError | InternalError>> {
    try {
        const event = await receiver.receive(body, authHeader);
        const { event: eventName } = event;

        logger.info('livekit webhook event', { event: eventName, room: event.room?.name });

        // Extract room name (which is our chat room ID)
        const roomName = event.room?.name;
        if (!roomName) {
            return ok("OK");
        }

        logger.debug('voice state before update', { room: roomName, state: voiceStateStore.get(roomName) });

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
                notifyJoinDiscordWebhook(event);
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

        logger.debug('voice state after update', { room: roomName, state: voiceStateStore.get(roomName) });

        return ok("OK");
    } catch (error: any) {
        // Signature verification failure is a 401; everything else is a 500
        if (error?.message?.includes('signature') || error?.message?.includes('webhook')) {
            logger.warn('webhook signature verification failed', { error: error.message });
            return err({ status: 401, code: 'UNAUTHORIZED', message: 'Invalid webhook signature' });
        }
        logger.error('webhook handler error', { error: String(error), stack: error?.stack });
        return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Internal Server Error' });
    }
}

async function notifyJoinDiscordWebhook(event: WebhookEvent) {
    if (!env.DISCORD_WEBHOOK_URL) {
        return;
    }
    // Check if we have a channel with that room id, otherwise its a private call or a testing room.
    const roomType = await ChatService.getRoomTypeAsSystem(event.room?.name ?? "");
    if (!roomType.ok || roomType.value !== "channel") {
        logger.debug('Skipping Discord webhook for participant_joined, room is not a channel', { room: event.room?.name });
        return;
    }
    logger.debug('Sending Discord webhook for participant_joined', { participant: event.participant?.identity, room: event.room?.name });
    fetch(env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: "Voice Chat",
            avatar_url: event.participant?.attributes?.image ?? undefined,
            content: `**${event.participant?.name ?? ""}** ist einem [Gnag Chat Voicecall](${env.HOSTNAME}/join?id=${event.room?.name ?? ""}) beigetreten!`,
        }),
    }).catch((err) => {
        logger.error('Failed to send Discord webhook', { error: String(err), stack: err?.stack });
    });
}
