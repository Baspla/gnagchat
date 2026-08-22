import { err, ok, type Result, type BadRequestError } from '../lib/result';

export interface HistoryCursor {
    createdAt: string; // ISO timestamp
    id: string;
}

/**
 * Encodes a cursor (createdAt + id) into an opaque base64url string.
 */
export function encodeHistoryCursor(cursor: HistoryCursor): string {
    const json = JSON.stringify(cursor);
    return Buffer.from(json).toString('base64url');
}

/**
 * Decodes an opaque base64url cursor back into a HistoryCursor.
 * Returns a Result with a BadRequestError if the cursor is malformed.
 */
export function decodeHistoryCursor(cursor: string): Result<HistoryCursor, BadRequestError> {
    try {
        const json = Buffer.from(cursor, 'base64url').toString('utf-8');
        const parsed = JSON.parse(json) as HistoryCursor;
        if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
            throw new Error('Invalid cursor shape');
        }
        return ok(parsed);
    } catch {
        return err({ status: 400, code: 'BAD_REQUEST', message: 'Invalid history cursor' });
    }
}