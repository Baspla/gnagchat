import type { User } from 'better-auth';
import * as jose from 'jose'
import { env } from "../../env";
import type { WsMessage } from '$shared/dto/ws-message';
import { createLogger } from '../../lib/logger';

const logger = createLogger('gateway');

export async function generateCentrifugoToken(user: User, deviceId: string): Promise<string> {
    let channels = [`user:${user.id}`, `device:${user.id}:${deviceId}`, `presence`];
    return generateCentrifugoTokenForChannels(user, channels);
}

async function generateCentrifugoTokenForChannels(user: User, channels: string[]): Promise<string> {
    const payload = {
        'sub': user.id,
        'exp': Math.floor(Date.now() / 1000) + 120,
        'channels': channels
    };
    const secret = new TextEncoder().encode(env.CENTRIFUGO_SECRET);
    const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret);

    return token;
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

export async function broadcastMessage(channels: string[], data: WsMessage): Promise<void> {
    const broadcast_payload = {
        channels: channels,
        data: data,
    };
    const response = await sendAPIMessage('/api/broadcast', broadcast_payload);
    if (!response.ok) {
        logger.error('failed to broadcast message', { status: response.status, statusText: response.statusText });
        throw new Error(`Centrifugo broadcast failed: ${response.status} ${response.statusText}`);
    }
}
