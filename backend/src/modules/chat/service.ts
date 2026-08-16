import { eq, and, gt, desc, or, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { message, roomReadState, room, channel, directMessage} from './schema';
import type { Message } from './schema';
import { PermissionService } from '../permission/service';
import { user } from '../user/schema';
import type { User } from '../user/schema';
import { validateChannelName } from '../../util/validation';
import type { DtoUser, DtoChatMessage, DtoChannel } from '$shared/dto/chat';
import type { WsMessage } from '$shared/dto/ws-message';
import type { DtoVoiceRoom } from '$shared/dto/voice-room';
import { broadcastMessage } from '../gateway/service';
import { voiceStateStore } from '../livekit/voice-state';

export class ChatService {

    /**
     * Checks if a user has permission to view a specific room.
     */
    static async canViewRoomAsUser(userId: string, roomId: string): Promise<boolean> {
        return true;
        /*
        const foundRoom = await db.query.room.findFirst({
            where: eq(room.id, roomId)
        });

        if (!foundRoom) {
            return false;
        }
        if (foundRoom.type === 'channel') {
            return await PermissionService.hasPermissionInChannel(userId, roomId, 'view_channel');
        } else if (foundRoom.type === 'dm') {
            const dm = await db.query.directMessage.findFirst({
                where: and(
                    eq(directMessage.roomId, roomId),
                    or(eq(directMessage.userAId, userId), eq(directMessage.userBId, userId))
                )
            });
            return !!dm;
        } else {
            return false;
        }*/
    }

    private static async getRoomTypeAsUser(userId: string, roomId: string): Promise<{ type: 'channel' | 'dm' }> {
        const canView = await this.canViewRoomAsUser(userId, roomId);
        const targetRoom = await db.query.room.findFirst({
            where: eq(room.id, roomId)
        });

        if (!targetRoom) {
            throw new Error('Room not found');
        }
        if (!canView) {
            if (targetRoom.type === 'channel') {
                throw new Error('Forbidden: Insufficient permissions to view this channel');
            } else {
                throw new Error('Forbidden: Not a participant of this direct message');
            }
        }

        return { type: targetRoom.type };
    }

    /**
     * Saves a message after validating room access and send permissions.
     * Scoped as: ...AsUser
     */
    static async saveMessageAsUser(userId: string, roomId: string, content: string, nonce?: string) {
        const canView = await this.canViewRoomAsUser(userId, roomId);
        if (!canView) {
            throw new Error('Forbidden: Insufficient permissions to view this room');
        }

        const roomInfo = await this.getRoomTypeAsUser(userId, roomId);

        // 2. If it's a channel, explicitly check send permissions
        if (roomInfo.type === 'channel') {
            const canSend = await PermissionService.hasPermissionInChannel(userId, roomId, 'send_messages');
            if (!canSend) {
                throw new Error('Forbidden: Insufficient permissions to send messages in this channel');
            }
        } else if (roomInfo.type === 'dm') {
            // For DMs, no additional permission checks are needed since access was already verified
        } else {
            throw new Error('Unknown room type');
        }

        // 3. Save Message
        const [savedMessage] = await db.insert(message).values({
            roomId,
            userId,
            content,
        }).returning();

        // 4. Get User info for DTO

        const userRecord: User | undefined = await db.query.user.findFirst({
            where: eq(user.id, userId)
        });

        const dto = await this.transformMessageToDto(savedMessage, nonce);
        console.log(`dto for saved message:`, dto);

        // 5. Determine all users to recieve this message
        const roomMembers = await this.getRoomMemberIdsAsSystem(roomId);

        // 6. Publish message to all recipients' channels
        const wsMessage: WsMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            payload: {
                type: "message_create",
                data: dto,
            },
        };

        broadcastMessage(roomMembers.map(id => `user:${id}`), wsMessage).then(() => {
            console.log(`Message broadcasted to room ${roomId}:`, wsMessage);
        }).catch(err => {
            console.error(`Failed to broadcast message to room ${roomId}:`, err);
        }).then(() => {
            console.log(`Message saved and published to room ${roomId}:`, savedMessage);
        });

        return dto;
    }

    /**
     * Fetches historical messages after validating room access.
     * Scoped as: ...AsUser
     */
    static async getHistoryAsUser(userId: string, roomId: string, limit: number = 50) {
        // 1. Validate access first
        await this.canViewRoomAsUser(userId, roomId);

        // 2. Fetch history
        const messages = await db.query.message.findMany({
            where: eq(message.roomId, roomId),
            orderBy: [desc(message.createdAt)],
            limit,
        });
        return this.transformMessagesToDto(messages);
    }

    static async getRoomMemberIdsAsSystem(roomId: string): Promise<string[]> {
        const targetRoom = await db.query.room.findFirst({
            where: eq(room.id, roomId)
        });

        if (!targetRoom) {
            throw new Error('Room not found');
        }

        if (targetRoom.type === 'channel') {
            const allUsers = await db.select({ id: user.id }).from(user);

            const memberIds: string[] = [];

            for (const u of allUsers) {
                const canView = await this.canViewRoomAsUser(u.id, roomId);
                if (canView) {
                    memberIds.push(u.id);
                }
            }

            return memberIds;

        } else if (targetRoom.type === 'dm') {
            const dm = await db.query.directMessage.findFirst({
                where: eq(directMessage.roomId, roomId)
            });

            if (dm) {
                return [dm.userAId, dm.userBId];
            }
        }

        return [];
    }

    /**
     * Updates the user's watermark read state after validating room access.
     * Scoped as: ...AsUser
     */
    static async markRoomAsReadAsUser(userId: string, roomId: string) {
        await this.canViewRoomAsUser(userId, roomId);

        await db.insert(roomReadState)
            .values({
                roomId,
                userId,
                lastReadAt: new Date()
            })
            .onConflictDoUpdate({
                target: [roomReadState.roomId, roomReadState.userId],
                set: { lastReadAt: new Date() }
            });
    }

    /**
     * Calculates unread messages for a specific room after validating access.
     * Scoped as: ...AsUser
     */
    static async getUnreadCountAsUser(userId: string, roomId: string): Promise<number> {
        await this.canViewRoomAsUser(userId, roomId);

        const readState = await db.query.roomReadState.findFirst({
            where: and(
                eq(roomReadState.roomId, roomId),
                eq(roomReadState.userId, userId)
            )
        });

        const watermarkTime = readState ? readState.lastReadAt : new Date(0);

        const unreadMessages = await db.query.message.findMany({
            where: and(
                eq(message.roomId, roomId),
                gt(message.createdAt, watermarkTime)
            )
        });

        return unreadMessages.length;
    }

    /**
     * Creates a new channel room. No permission checks (deferred).
     */
    static async createChannel(name: string): Promise<DtoChannel> {
        const validation = validateChannelName(name);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const trimmedName = name.trim();

        const [newRoom] = await db.insert(room).values({
            type: 'channel',
            createdAt: new Date(),
        }).returning();

        await db.insert(channel).values({
            roomId: newRoom.id,
            name: trimmedName,
        });

        const memberIds = await this.getRoomMemberIdsAsSystem(newRoom.id);

        //TODO

        return {
            roomId: newRoom.id,
            name: trimmedName,
            createdAt: newRoom.createdAt,
        };
    }

    /**
     * Deletes a channel after validating the user has the 'delete_channel' permission.
     */
    static async deleteChannelAsUser(userId: string, channelId: string) {
        // 1. Check permission
        const canDelete = await PermissionService.hasPermissionInChannel(userId, channelId, 'delete_channel');
        if (!canDelete) {
            throw new Error('Forbidden: Insufficient permissions to delete this channel');
        }

        // 2. Verify the room exists and is a channel
        const targetRoom = await db.query.room.findFirst({
            where: eq(room.id, channelId)
        });

        if (!targetRoom) {
            throw new Error('Channel not found');
        }

        if (targetRoom.type !== 'channel') {
            throw new Error('Room is not a channel');
        }

        // 3. Get all member IDs before deletion (for subscription recalculation)
        const memberIds = await this.getRoomMemberIdsAsSystem(channelId);

        // 4. Delete the room (cascade deletes channel, messages, read states)
        await db.delete(room).where(eq(room.id, channelId));

        // 5. Publish channel_deleted event to the room topic
        //TODO

        return { success: true };
    }

    /**
     * Returns all channels the user has permission to view, ordered by creation date.
     */
    static async getAccessibleChannelsAsUser(userId: string): Promise<DtoChannel[]> {
        const allChannels = await db
            .select({
                roomId: channel.roomId,
                name: channel.name,
                createdAt: room.createdAt,
            })
            .from(channel)
            .innerJoin(room, eq(channel.roomId, room.id))
            .orderBy(room.createdAt);

        const accessible: { roomId: string; name: string; createdAt: Date }[] = [];

        for (const ch of allChannels) {
            const canView = await this.canViewRoomAsUser(userId, ch.roomId);
            if (canView) {
                accessible.push(ch);
            }
        }

        // Attach voice state from in-memory store
        const roomIds = accessible.map((ch) => ch.roomId);
        const voiceStates = voiceStateStore.getForRoomIds(roomIds);
        const voiceStateMap = new Map(voiceStates.map((vs) => [vs.roomId, vs.state]));

        return accessible.map((ch) => ({
            ...ch,
            voiceState: voiceStateMap.get(ch.roomId) ?? null,
        }));
    }

    static async transformMessagesToDto(messages: Message[], nonce?: string): Promise<DtoChatMessage[]> {
        const dtos: DtoChatMessage[] = [];
        const authorIds = Array.from(new Set(messages.map(m => m.userId)));

        const authors = await db.select().from(user).where(inArray(user.id, authorIds));

        const authorMap: Record<string, DtoUser> = {};

        for (const a of authors) {
            authorMap[a.id] = this.transformUserToDto(a);
        }

        for (const msg of messages) {
            const dtoAuthor = authorMap[msg.userId] || {
                id: msg.userId,
                displayName: null,
                avatarUrl: null,
            };

            dtos.push(this.transformMessageToDtoWithAuthor(msg, dtoAuthor, nonce));
        }
        return dtos;
    }

    static transformUserToDto(user: User): DtoUser {
        return {
            id: user.id,
            displayName: user.name || null,
            avatarUrl: user.image || null
        };
    }

    static transformMessageToDto(msg: Message, nonce?: string): Promise<DtoChatMessage> {
        return this.transformMessagesToDto([msg], nonce).then(dtos => dtos[0]);
    }

    static transformMessageToDtoWithAuthor(msg: Message, author: DtoUser, nonce?: string): DtoChatMessage {
        return {
            id: msg.id,
            roomId: msg.roomId,
            author,
            content: msg.content,
            createdAt: msg.createdAt,
            editedAt: msg.createdAt,
            mentions: [], // Populate mentions if applicable
            emojis: [], // Populate emojis if applicable
            reactions: [], // Populate reactions if applicable
            nonce: nonce ?? '', // Use a nonce if needed
            pinned: false, // Set pinned status if applicable
            type: 'text',
        };
    }
}
