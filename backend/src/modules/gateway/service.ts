import type { User } from 'better-auth';
import * as jose from 'jose'
import { env } from "../../env";
import type { WsMessage } from '$shared/dto/ws-message';

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

async function sendAPIMessage(path: string,payload: any): Promise<Response> {
    console.log(`[debug] Sending API message to Centrifugo: ${env.CENTRIFUGO_URL}${path} with payload:`, payload);
    const url = `${env.CENTRIFUGO_URL}${path}`;
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.CENTRIFUGO_API_KEY as string,
            'X-Centrifugo-Error-Mode': 'transport',
        },
        body: JSON.stringify(payload),
    }).then(async response => {
        console.log(`[debug] Received response from Centrifugo: ${response.status} ${response.statusText}`);
        const body = await response.body?.getReader().read();
        if (body) {
            const text = new TextDecoder().decode(body.value);
            console.log(`[debug] Response body: ${text}`);
        }
        return response;
    });
}

/**
 * 
 * @param channels 
 * @param data 
 */
export async function broadcastMessage(channels: string[], data: WsMessage): Promise<void> {
    const broadcast_payload = {
        channels: channels,
        data: data,
    };
    sendAPIMessage('/api/broadcast', broadcast_payload).then(response => {
        if (!response.ok) {
            console.error(`Failed to broadcast message: ${response.status} ${response.statusText}`);
        }
    }).catch(error => {
        console.error(`Error broadcasting message: ${error}`);
    });
}
