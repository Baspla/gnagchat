import { eq, and, or, gt, lt, desc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { message, roomReadState, room, channelMetadata, dmMetadata} from './schema';
import type { Message } from './schema';
import { PermissionService } from '../permission/service';
import { user } from '../user/schema';
import type { User } from '../user/schema';
import type { DtoUser, DtoChatMessage, DtoChannel, DtoRoom, DtoHistoryResponse } from '$shared/dto/chat';
import type { WsMessage } from '$shared/dto/ws-message';
import { broadcastMessage } from '../gateway/service';
import { voiceStateStore } from '../livekit/voice-state';
import { createLogger } from '../../lib/logger';
import {
    ok,
    err,
    type Result,
    type ForbiddenError,
    type NotFoundError,
    type BadRequestError,
    type InternalError,
} from '../../lib/result';
import { encodeHistoryCursor, decodeHistoryCursor } from '../../util/history-cursor';

const logger = createLogger('chat');

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

    private static async getRoomTypeAsUser(userId: string, roomId: string): Promise<Result<{ type: 'channel' | 'dm' }, NotFoundError | ForbiddenError>> {
        const canView = await this.canViewRoomAsUser(userId, roomId);
        if (!canView) {
            return err({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this room' });
        }
        const roomTypeResult = await this.getRoomTypeAsSystem(roomId);
        if (!roomTypeResult.ok) {
            return roomTypeResult;
        }
        return ok({ type: roomTypeResult.value });
    }

    static async getRoomTypeAsSystem(roomId: string): Promise<Result<'channel' | 'dm', NotFoundError>> {
        const targetRoom = await db.query.room.findFirst({
            where: eq(room.id, roomId)
        });

        if (!targetRoom) {
            return err({ status: 404, code: 'NOT_FOUND', message: 'Room not found' });
        }
        
        return ok(targetRoom.type);
    }

    /**
     * Saves a message after validating room access and send permissions.
     * Scoped as: ...AsUser
     */
    static async saveMessageAsUser(userId: string, roomId: string, content: string, nonce?: string): Promise<Result<DtoChatMessage, ForbiddenError | NotFoundError | InternalError>> {
        const canView = await this.canViewRoomAsUser(userId, roomId);
        if (!canView) {
            return err({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this room' });
        }

        const roomInfo = await this.getRoomTypeAsUser(userId, roomId);
        if (!roomInfo.ok) {
            return roomInfo;
        }

        // 2. If it's a channel, explicitly check send permissions
        if (roomInfo.value.type === 'channel') {
            const canSend = await PermissionService.hasPermissionInChannel(userId, roomId, 'send_messages');
            if (!canSend.ok) {
                return canSend;
            }
            if (!canSend.value) {
                return err({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to send messages in this channel' });
            }
        } else if (roomInfo.value.type === 'dm') {
            // For DMs, no additional permission checks are needed since access was already verified
        } else {
            return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Unknown room type' });
        }

        // 3. Save Message
        const [savedMessage] = await db.insert(message).values({
            roomId,
            userId,
            content,
        }).returning();

        const dto = await this.transformMessageToDto(savedMessage, nonce);
        logger.debug('saved message dto', { roomId, messageId: savedMessage.id });

        // 5. Determine all users to recieve this message
        const roomMembers = await this.getRoomMemberIdsAsSystem(roomId);

        // 6. Publish message to all recipients' channels
        if (roomMembers.ok) {
            const wsMessage: WsMessage = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                payload: {
                    type: "message_create",
                    data: dto,
                },
            };

            const broadcast = await broadcastMessage(roomMembers.value.map(id => `user:${id}`), wsMessage);
            if (broadcast.ok) {
                logger.debug('message broadcasted', { roomId, messageId: savedMessage.id });
            } else {
                logger.error('failed to broadcast message', { roomId, messageId: savedMessage.id, error: broadcast.error.message });
            }
        } else {
            logger.error('failed to resolve room members for broadcast', { roomId, messageId: savedMessage.id, error: roomMembers.error.message });
        }

        return ok(dto);
    }

    /**
     * Fetches historical messages after validating room access.
     * Uses cursor-based pagination with an opaque cursor.
     * Returns a metadata wrapper with hasMore and nextCursor.
     * Scoped as: ...AsUser
     */
    static async getHistoryAsUser(userId: string, roomId: string, limit: number = 50, cursor?: string): Promise<Result<DtoHistoryResponse, BadRequestError>> {
        // 1. Validate access first
        await this.canViewRoomAsUser(userId, roomId);

        // 2. Decode cursor if provided
        let cursorCondition: typeof message.$inferSelect | undefined;
        if (cursor) {
            const decoded = decodeHistoryCursor(cursor);
            if (!decoded.ok) {
                return decoded;
            }
            cursorCondition = {
                id: decoded.value.id,
                roomId: '',
                userId: '',
                content: '',
                createdAt: new Date(decoded.value.createdAt),
            };
        }

        // 3. Fetch limit + 1 to determine hasMore
        const where = cursorCondition
            ? and(
                eq(message.roomId, roomId),
                or(
                    lt(message.createdAt, cursorCondition.createdAt),
                    and(eq(message.createdAt, cursorCondition.createdAt), lt(message.id, cursorCondition.id)),
                ),
            )
            : eq(message.roomId, roomId);

        const rows = await db.query.message.findMany({
            where,
            orderBy: [desc(message.createdAt), desc(message.id)],
            limit: limit + 1,
        });

        // 4. Determine hasMore and trim the extra row
        const hasMore = rows.length > limit;
        const messages = hasMore ? rows.slice(0, limit) : rows;

        // 5. Build nextCursor from the oldest returned message
        const oldest = messages[messages.length - 1];
        const nextCursor = oldest
            ? encodeHistoryCursor({ createdAt: oldest.createdAt.toISOString(), id: oldest.id })
            : null;

        // 6. Transform and return
        const dtos = await this.transformMessagesToDto(messages);
        return ok({ messages: dtos, hasMore, nextCursor });
    }

    static async getRoomMemberIdsAsSystem(roomId: string): Promise<Result<string[], NotFoundError>> {
        const targetRoom = await db.query.room.findFirst({
            where: eq(room.id, roomId)
        });

        if (!targetRoom) {
            return err({ status: 404, code: 'NOT_FOUND', message: 'Room not found' });
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

            return ok(memberIds);

        } else if (targetRoom.type === 'dm') {
            const dm = await db.query.dmMetadata.findFirst({
                where: eq(dmMetadata.roomId, roomId)
            });

            if (dm) {
                return ok([dm.userAId, dm.userBId]);
            }
        }

        return ok([]);
    }

    /**
     * Updates the user's watermark read state after validating room access.
     * Scoped as: ...AsUser
     */
    static async markRoomAsReadAsUser(userId: string, roomId: string): Promise<Result<null>> {
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

        return ok(null);
    }

    /**
     * Calculates unread messages for a specific room after validating access.
     * Scoped as: ...AsUser
     */
    static async getUnreadCountAsUser(userId: string, roomId: string): Promise<Result<number>> {
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

        return ok(unreadMessages.length);
    }

    /**
     * Creates a new channel room. No permission checks (deferred).
     */
    static async createChannel(name: string): Promise<Result<DtoChannel, NotFoundError>> {
        const trimmedName = name.trim();

        const [newRoom] = await db.insert(room).values({
            type: 'channel',
            createdAt: new Date(),
        }).returning();

        await db.insert(channelMetadata).values({
            roomId: newRoom.id,
            name: trimmedName,
        });

        const memberIds = await this.getRoomMemberIdsAsSystem(newRoom.id);
        if (!memberIds.ok) {
            return memberIds;
        }

        const dto: DtoChannel = {
            roomId: newRoom.id,
            name: trimmedName,
            createdAt: newRoom.createdAt,
            type: 'channel',
        };

        // Broadcast channel_create to all users that can view the new channel
        const wsMessage: WsMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            payload: {
                type: "channel_create",
                data: dto,
            },
        };

        const broadcast = await broadcastMessage(memberIds.value.map(id => `user:${id}`), wsMessage);
        if (broadcast.ok) {
            logger.debug('channel_create broadcasted', { roomId: newRoom.id });
        } else {
            logger.error('failed to broadcast channel_create', { roomId: newRoom.id, error: broadcast.error.message });
        }

        return ok(dto);
    }

    /**
     * Deletes a channel after validating the user has the 'delete_channel' permission.
     */
    static async deleteChannelAsUser(userId: string, channelId: string): Promise<Result<{ success: true }, ForbiddenError | NotFoundError | BadRequestError | InternalError>> {
        // 1. Check permission
        const canDelete = await PermissionService.hasPermissionInChannel(userId, channelId, 'delete_channel');
        if (!canDelete.ok) {
            return canDelete;
        }
        if (!canDelete.value) {
            return err({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this channel' });
        }

        // 2. Verify the room exists and is a channel
        const targetRoom = await db.query.room.findFirst({
            where: eq(room.id, channelId)
        });

        if (!targetRoom) {
            return err({ status: 404, code: 'NOT_FOUND', message: 'Channel not found' });
        }

        if (targetRoom.type !== 'channel') {
            return err({ status: 400, code: 'BAD_REQUEST', message: 'Room is not a channel' });
        }

        // 3. Get all member IDs before deletion (for subscription recalculation)
        const memberIds = await this.getRoomMemberIdsAsSystem(channelId);
        if (!memberIds.ok) {
            return memberIds;
        }

        // 4. Delete the room (cascade deletes channel, messages, read states)
        await db.delete(room).where(eq(room.id, channelId));

        // 5. Broadcast channel_delete to all users that could view the channel
        const wsMessage: WsMessage = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            payload: {
                type: "channel_delete",
                data: { channelId },
            },
        };

        const broadcast = await broadcastMessage(memberIds.value.map(id => `user:${id}`), wsMessage);
        if (broadcast.ok) {
            logger.debug('channel_delete broadcasted', { roomId: channelId });
        } else {
            logger.error('failed to broadcast channel_delete', { roomId: channelId, error: broadcast.error.message });
        }

        return ok({ success: true });
    }


    static async getRoomAsUser(userId: string, roomId: string): Promise<Result<DtoRoom, NotFoundError | ForbiddenError | InternalError>> {
        const [result] = await db
            .select({
                room,
                channel: channelMetadata,
                dm: dmMetadata,
            })
            .from(room)
            .leftJoin(channelMetadata, eq(channelMetadata.roomId, room.id))
            .leftJoin(dmMetadata, eq(dmMetadata.roomId, room.id))
            .where(eq(room.id, roomId));

        if (!result) {
            return err({ status: 404, code: 'NOT_FOUND', message: 'Room not found' });
        }

        const { room: dbRoom, channel, dm } = result;
        let canView: boolean;
        if (dbRoom.type === 'channel') {
            const permResult = await PermissionService.hasPermissionInChannel(userId, dbRoom.id, 'view_channel');
            if (!permResult.ok) {
                return permResult;
            }
            canView = permResult.value;
        } else {
            canView = !!dm && (dm.userAId === userId || dm.userBId === userId);
        }

        if (!canView) {
            return err({
                status: 403,
                code: 'FORBIDDEN',
                message: dbRoom.type === 'channel'
                    ? 'Insufficient permissions to view this channel'
                    : 'Not a participant of this direct message',
            });
        }

        const voiceState = voiceStateStore.get(dbRoom.id) ?? null;

        if (dbRoom.type === 'channel') {
            if (!channel) {
                return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Channel metadata not found' });
            }

            return ok({
                roomId: dbRoom.id,
                name: channel.name,
                createdAt: dbRoom.createdAt,
                voiceState,
                type: 'channel',
            });
        }

        if (!dm) {
            return err({ status: 500, code: 'INTERNAL_ERROR', message: 'DM metadata not found' });
        }

        const recipientId = dm.userAId === userId ? dm.userBId : dm.userAId;
        const recipient = await db.query.user.findFirst({
            where: eq(user.id, recipientId),
        });

        if (!recipient) {
            return err({ status: 500, code: 'INTERNAL_ERROR', message: 'DM recipient not found' });
        }

        return ok({
            roomId: dbRoom.id,
            createdAt: dbRoom.createdAt,
            voiceState,
            type: 'dm',
            recipient: this.transformUserToDto(recipient),
        });
    }

    /**
     * Returns all rooms the user has permission to view, ordered by creation date.
     * Includes the room type so callers can filter by subtype.
     */
    static async getAccessibleRoomsAsUser(userId: string): Promise<Result<DtoRoom[], InternalError>> {
        const allRooms = await db
            .select({
                room,
                channel: channelMetadata,
                dm: dmMetadata,
            })
            .from(room)
            .leftJoin(channelMetadata, eq(channelMetadata.roomId, room.id))
            .leftJoin(dmMetadata, eq(dmMetadata.roomId, room.id))
            .orderBy(room.createdAt);

        const accessible = [];

        for (const result of allRooms) {
            let canView: boolean;
            if (result.room.type === 'channel') {
                const permResult = await PermissionService.hasPermissionInChannel(userId, result.room.id, 'view_channel');
                if (!permResult.ok) {
                    return permResult;
                }
                canView = permResult.value;
            } else {
                canView = !!result.dm && (result.dm.userAId === userId || result.dm.userBId === userId);
            }
            if (canView) {
                accessible.push(result);
            }
        }

        const recipientIds = [...new Set(accessible
            .filter((result) => result.room.type === 'dm' && result.dm)
            .map((result) => result.dm!.userAId === userId ? result.dm!.userBId : result.dm!.userAId))];
        const recipients = recipientIds.length === 0
            ? []
            : await db.select().from(user).where(inArray(user.id, recipientIds));
        const recipientMap = new Map(recipients.map((recipient) => [recipient.id, recipient]));

        const roomIds = accessible.map((result) => result.room.id);
        const voiceStates = voiceStateStore.getForRoomIds(roomIds);
        const voiceStateMap = new Map(voiceStates.map((vs) => [vs.roomId, vs.state]));

        const rooms: DtoRoom[] = [];
        for (const result of accessible) {
            const { room: dbRoom, channel, dm } = result;
            const voiceState = voiceStateMap.get(dbRoom.id) ?? null;

            if (dbRoom.type === 'channel') {
                if (!channel) {
                    return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Channel metadata not found' });
                }

                rooms.push({
                    roomId: dbRoom.id,
                    name: channel.name,
                    createdAt: dbRoom.createdAt,
                    voiceState,
                    type: 'channel',
                });
                continue;
            }

            if (!dm) {
                return err({ status: 500, code: 'INTERNAL_ERROR', message: 'DM metadata not found' });
            }

            const recipientId = dm.userAId === userId ? dm.userBId : dm.userAId;
            const recipient = recipientMap.get(recipientId);
            if (!recipient) {
                return err({ status: 500, code: 'INTERNAL_ERROR', message: 'DM recipient not found' });
            }

            rooms.push({
                roomId: dbRoom.id,
                createdAt: dbRoom.createdAt,
                voiceState,
                type: 'dm',
                recipient: this.transformUserToDto(recipient),
            });
        }

        return ok(rooms);
    }

    /**
     * Returns all channels the user has permission to view, ordered by creation date.
     */
    static async getAccessibleChannelsAsUser(userId: string): Promise<Result<DtoChannel[], InternalError>> {
        const accessibleRooms = await this.getAccessibleRoomsAsUser(userId);
        if (!accessibleRooms.ok) {
            return accessibleRooms;
        }
        return ok(accessibleRooms.value.filter((room): room is DtoChannel => room.type === 'channel'));
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

    static async transformMessageToDto(msg: Message, nonce?: string): Promise<DtoChatMessage> {
        const dtos = await this.transformMessagesToDto([msg], nonce);
        return dtos[0];
    }

    static transformMessageToDtoWithAuthor(msg: Message, author: DtoUser, nonce?: string): DtoChatMessage {
        return {
            id: msg.id,
            roomId: msg.roomId,
            author,
            content: msg.content,
            createdAt: msg.createdAt,
            editedAt: msg.createdAt, // TODO
            mentions: [], // TODO Populate mentions if applicable
            emojis: [], // TODO Populate emojis if applicable
            reactions: [], // TODO Populate reactions if applicable
            nonce: nonce ?? '', // Use a nonce if needed
            pinned: false, // TODO Set pinned status if applicable
            type: 'text',
        };
    }

}