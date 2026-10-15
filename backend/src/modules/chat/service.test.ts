import { describe, expect, it } from 'bun:test';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { ChatService } from './service';
import { dmMetadata, message, room, roomReadState } from './schema';
import { user } from '../user/schema';
import { UserService } from '../user/service';

function createFixtureIds() {
    const suffix = crypto.randomUUID();
    return {
        userAId: `user-a-${suffix}`,
        userBId: `user-b-${suffix}`,
        outsiderId: `user-outsider-${suffix}`,
        roomId: `dm-${suffix}`,
        messageIds: [`message-a-${suffix}`, `message-b-${suffix}`, `message-c-${suffix}`],
    };
}

async function insertUser(id: string) {
    await db.insert(user).values({
        id,
        name: id,
        email: `${id}@example.test`,
        emailVerified: true,
        image: null,
        groups: '[]',
    });
}

async function insertDmRoom(userAId: string, userBId: string, roomId: string) {
    await db.insert(room).values({ id: roomId, type: 'dm' });
    await db.insert(dmMetadata).values({ roomId, userAId, userBId });
}

describe('ChatService with SQLite', () => {
    it('returns full user details to the owner and redacts them for other users', async () => {
        const ids = createFixtureIds();
        await insertUser(ids.userAId);
        await insertUser(ids.userBId);

        const ownerView = await UserService.getUserAsUser(ids.userAId, ids.userAId);
        const otherUserView = await UserService.getUserAsUser(ids.userBId, ids.userAId);

        expect(ownerView.ok).toBe(true);
        if (!ownerView.ok) throw new Error('Expected owner profile to exist');
        expect(ownerView.value).toHaveProperty('email', `${ids.userAId}@example.test`);

        expect(otherUserView.ok).toBe(true);
        if (!otherUserView.ok) throw new Error('Expected public profile to exist');
        expect(otherUserView.value).toEqual({ id: ids.userAId, name: ids.userAId, image: null });
        expect(otherUserView.value).not.toHaveProperty('email');
    });

    it('allows only direct-message participants to view a DM', async () => {
        const ids = createFixtureIds();
        await insertUser(ids.userAId);
        await insertUser(ids.userBId);
        await insertUser(ids.outsiderId);
        await insertDmRoom(ids.userAId, ids.userBId, ids.roomId);

        expect(await ChatService.canViewRoomAsUser(ids.userAId, ids.roomId)).toBe(true);
        expect(await ChatService.canViewRoomAsUser(ids.userBId, ids.roomId)).toBe(true);
        expect(await ChatService.canViewRoomAsUser(ids.outsiderId, ids.roomId)).toBe(false);
        expect(await ChatService.canViewRoomAsUser(ids.outsiderId, `missing-${ids.roomId}`)).toBe(false);
    });

    it('returns forbidden instead of history when a user is not a DM participant', async () => {
        const ids = createFixtureIds();
        await insertUser(ids.userAId);
        await insertUser(ids.userBId);
        await insertUser(ids.outsiderId);
        await insertDmRoom(ids.userAId, ids.userBId, ids.roomId);

        const result = await ChatService.getHistoryAsUser(ids.outsiderId, ids.roomId);

        expect(result).toEqual({
            ok: false,
            error: { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this room' },
        });
    });

    it('blocks non-participants from sending messages or changing read state', async () => {
        const ids = createFixtureIds();
        await insertUser(ids.userAId);
        await insertUser(ids.userBId);
        await insertUser(ids.outsiderId);
        await insertDmRoom(ids.userAId, ids.userBId, ids.roomId);

        const sent = await ChatService.saveMessageAsUser(ids.outsiderId, ids.roomId, 'secret');
        const markedRead = await ChatService.markRoomAsReadAsUser(ids.outsiderId, ids.roomId);
        const unread = await ChatService.getUnreadCountAsUser(ids.outsiderId, ids.roomId);

        for (const result of [sent, markedRead, unread]) {
            expect(result).toEqual({
                ok: false,
                error: { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this room' },
            });
        }

        expect(await db.query.message.findMany({ where: eq(message.roomId, ids.roomId) })).toHaveLength(0);
    });

    it('counts unread messages and advances the read watermark for an authorized participant', async () => {
        const ids = createFixtureIds();
        await insertUser(ids.userAId);
        await insertUser(ids.userBId);
        await insertDmRoom(ids.userAId, ids.userBId, ids.roomId);
        await db.insert(message).values([
            { id: ids.messageIds[0]!, roomId: ids.roomId, userId: ids.userBId, content: 'First' },
            { id: ids.messageIds[1]!, roomId: ids.roomId, userId: ids.userBId, content: 'Second' },
        ]);

        expect(await ChatService.getUnreadCountAsUser(ids.userAId, ids.roomId)).toEqual({ ok: true, value: 2 });
        expect(await ChatService.markRoomAsReadAsUser(ids.userAId, ids.roomId)).toEqual({ ok: true, value: null });
        expect(await ChatService.getUnreadCountAsUser(ids.userAId, ids.roomId)).toEqual({ ok: true, value: 0 });
        expect(await db.query.roomReadState.findMany({ where: eq(roomReadState.roomId, ids.roomId) })).toHaveLength(1);
    });

    it('paginates message history in stable timestamp/id order', async () => {
        const ids = createFixtureIds();
        await insertUser(ids.userAId);
        await insertUser(ids.userBId);
        await insertDmRoom(ids.userAId, ids.userBId, ids.roomId);

        const createdAt = new Date('2026-10-16T12:00:00.000Z');
        await db.insert(message).values([
            { id: ids.messageIds[0]!, roomId: ids.roomId, userId: ids.userAId, content: 'A', createdAt },
            { id: ids.messageIds[1]!, roomId: ids.roomId, userId: ids.userAId, content: 'B', createdAt },
            { id: ids.messageIds[2]!, roomId: ids.roomId, userId: ids.userBId, content: 'C', createdAt },
        ]);

        const firstPage = await ChatService.getHistoryAsUser(ids.userAId, ids.roomId, 2);
        expect(firstPage.ok).toBe(true);
        if (!firstPage.ok) throw new Error('Expected first page to succeed');
        expect(firstPage.value.messages.map((item) => item.id)).toEqual([...ids.messageIds].reverse().slice(0, 2));
        expect(firstPage.value.hasMore).toBe(true);
        expect(firstPage.value.nextCursor).not.toBeNull();

        const secondPage = await ChatService.getHistoryAsUser(
            ids.userAId,
            ids.roomId,
            2,
            firstPage.value.nextCursor ?? undefined,
        );
        expect(secondPage.ok).toBe(true);
        if (!secondPage.ok) throw new Error('Expected second page to succeed');
        expect(secondPage.value.messages.map((item) => item.id)).toEqual([ids.messageIds[0]]);
        expect(secondPage.value.hasMore).toBe(false);
    });
});