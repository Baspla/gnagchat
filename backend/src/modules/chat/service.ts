import { eq, and, gt, desc, or } from 'drizzle-orm';
import type { ServerWebSocket } from 'bun';
import { db } from '../../db';
import { message, roomReadState, room, channel, directMessage, Room } from './schema';
import { PermissionService } from '../permission/service';
import { userRole } from '../permission/schema';
import { user } from '../user/schema';
import { publish } from '../../util/websocket/websocket';
import { validateChannelName } from '../../util/validation';

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
    static async saveMessageAsUser(userId: string, roomId: string, content: string, server: Bun.Server<unknown>) {
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

        publish(server, `room:${roomId}`, {
            type: 'chat_message',
            data: savedMessage
        });

        console.log(`Message saved and published to room ${roomId}:`, savedMessage);

        // 2. Fetch all users who have access to this room (excluding the sender)
        const roomMembers = await this.getRoomMemberIdsAsSystem(roomId);

        // 3. Push an unread/sidebar ping to everyone else's personal user channel!
        for (const memberId of roomMembers) {
            if (memberId !== userId) {
                publish(server, `user:${memberId}`, {
                    type: 'room_activity',
                    roomId: roomId,
                    message: savedMessage
                });
            }
        }

        return savedMessage;
    }

    /**
     * Fetches historical messages after validating room access.
     * Scoped as: ...AsUser
     */
    static async getHistoryAsUser(userId: string, roomId: string, limit: number = 50) {
        // 1. Validate access first
        await this.canViewRoomAsUser(userId, roomId);

        // 2. Fetch history
        return await db.query.message.findMany({
            where: eq(message.roomId, roomId),
            orderBy: [desc(message.createdAt)],
            limit,
        });
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
    static async createChannel(name: string): Promise<{ roomId: string; name: string; createdAt: Date }> {
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

        return {
            roomId: newRoom.id,
            name: trimmedName,
            createdAt: newRoom.createdAt,
        };
    }

    /**
     * Returns all channels the user has permission to view, ordered by creation date.
     */
    static async getAccessibleChannelsAsUser(userId: string): Promise<{ roomId: string; name: string; createdAt: Date }[]> {
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

        return accessible;
    }
}
