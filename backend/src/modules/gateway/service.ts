import type { User } from 'better-auth';
import * as jose from 'jose'
import { env } from "../../env";
import type { WsMessage } from '$shared/dto/ws-message';
import { createLogger } from '../../lib/logger';
import { ok, err, type Result, type InternalError } from '../../lib/result';

const logger = createLogger('gateway');

export async function generateCentrifugoToken(user: User, deviceId: string): Promise<Result<string, InternalError>> {
    const channels = [`user:${user.id}`, `device:${user.id}:${deviceId}`, `presence`];
    return generateCentrifugoTokenForChannels(user, channels);
}

async function generateCentrifugoTokenForChannels(user: User, channels: string[]): Promise<Result<string, InternalError>> {
    const payload = {
        'sub': user.id,
        'exp': Math.floor(Date.now() / 1000) + 120,
        'channels': channels
    };
    try {
        const secret = new TextEncoder().encode(env.CENTRIFUGO_SECRET);
        const token = await new jose.SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret);

        return ok(token);
    } catch (e) {
        logger.error('failed to sign centrifugo token', { userId: user.id, error: String(e) });
        return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Failed to generate gateway token' });
    }
}

async function sendAPIMessage(path: string, payload: unknown): Promise<Response> {
    logger.debug('sending api message', { path, payload });
    const url = `${env.CENTRIFUGO_URL}${path}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.CENTRIFUGO_API_KEY as string,
            'X-Centrifugo-Error-Mode': 'transport',
        },
        body: JSON.stringify(payload),
    });

    logger.debug('centrifugo response', { status: response.status, statusText: response.statusText });
    return response;
}

export async function broadcastMessage(channels: string[], data: WsMessage): Promise<Result<null, InternalError>> {
    const broadcast_payload = {
        channels: channels,
        data: data,
    };
    try {
        const response = await sendAPIMessage('/api/broadcast', broadcast_payload);
        if (!response.ok) {
            logger.error('failed to broadcast message', { status: response.status, statusText: response.statusText });
            return err({ status: 500, code: 'INTERNAL_ERROR', message: `Centrifugo broadcast failed: ${response.status} ${response.statusText}` });
        }
        return ok(null);
    } catch (e) {
        logger.error('failed to reach centrifugo for broadcast', { error: String(e) });
        return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Failed to reach Centrifugo for broadcast' });
    }
}