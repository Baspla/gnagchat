import { describe, expect, it } from 'bun:test';
import { err, ok } from './result';

describe('Result helpers', () => {
    it('wraps successful values', () => {
        expect(ok({ id: 'user-1' })).toEqual({ ok: true, value: { id: 'user-1' } });
    });

    it('wraps domain errors', () => {
        const error = { status: 404, code: 'NOT_FOUND', message: 'User not found' } as const;

        expect(err(error)).toEqual({ ok: false, error });
    });
});