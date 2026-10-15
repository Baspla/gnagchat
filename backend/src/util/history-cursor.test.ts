import { describe, expect, it } from 'bun:test';
import { decodeHistoryCursor, encodeHistoryCursor } from './history-cursor';

describe('history cursors', () => {
    it('round-trips timestamp and message id', () => {
        const cursor = { createdAt: '2026-10-16T12:34:56.000Z', id: 'message-123' };

        expect(decodeHistoryCursor(encodeHistoryCursor(cursor))).toEqual({ ok: true, value: cursor });
    });

    it.each([
        'not-base64-json',
        Buffer.from('{}').toString('base64url'),
        Buffer.from('{').toString('base64url'),
        Buffer.from(JSON.stringify({ createdAt: 'not-a-date', id: 'message-1' })).toString('base64url'),
    ])('returns a bad-request result for malformed cursor %s', (cursor) => {
        expect(decodeHistoryCursor(cursor)).toEqual({
            ok: false,
            error: { status: 400, code: 'BAD_REQUEST', message: 'Invalid history cursor' },
        });
    });
});