import { describe, expect, it } from 'bun:test';
import { voiceStateStore } from './voice-state';

describe('LiveKit voice state', () => {
    it('groups multiple device identities under one user and removes the room after the final device leaves', () => {
        const roomId = `voice-${crypto.randomUUID()}`;

        expect(voiceStateStore.roomStarted(roomId, 'room-sid')).toBe(true);
        expect(voiceStateStore.participantJoined(roomId, 'user-1:desktop', 'Alice', null)).toBe('user-1');
        expect(voiceStateStore.participantJoined(roomId, 'user-1:mobile', 'Alice', null)).toBeUndefined();

        const state = voiceStateStore.get(roomId);
        expect(state?.userCount).toBe(1);
        expect(state?.users).toHaveLength(1);
        expect(state?.users[0]?.devices.map((device) => device.identity)).toEqual([
            'user-1:desktop',
            'user-1:mobile',
        ]);

        expect(voiceStateStore.participantLeft(roomId, 'user-1:desktop')).toBe('updated');
        expect(voiceStateStore.get(roomId)?.users[0]?.devices).toHaveLength(1);
        expect(voiceStateStore.participantLeft(roomId, 'user-1:mobile')).toBe('deleted');
        expect(voiceStateStore.get(roomId)).toBeUndefined();
    });

    it('updates and removes tracks on the matching device only', () => {
        const roomId = `voice-${crypto.randomUUID()}`;
        voiceStateStore.roomStarted(roomId, 'room-sid');
        voiceStateStore.participantJoined(roomId, 'user-2:desktop', 'Bob', null);

        expect(voiceStateStore.trackPublished(roomId, 'user-2:desktop', 'track-1', 'audio', false)).toBe(true);
        expect(voiceStateStore.trackPublished(roomId, 'user-2:desktop', 'track-1', 'audio', true)).toBe(false);
        expect(voiceStateStore.get(roomId)?.users[0]?.devices[0]?.tracks).toEqual([
            { sid: 'track-1', kind: 'audio', muted: true },
        ]);
        expect(voiceStateStore.trackPublished(roomId, 'user-2:other-device', 'track-2', 'video', false)).toBe(false);
        expect(voiceStateStore.trackUnpublished(roomId, 'user-2:desktop', 'track-1')).toBe(true);
        expect(voiceStateStore.trackUnpublished(roomId, 'user-2:desktop', 'track-1')).toBe(false);

        voiceStateStore.roomFinished(roomId);
    });
});