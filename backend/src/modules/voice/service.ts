import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../env';

export async function createVoiceToken(userId: string, userName: string, room: string): Promise<string> {
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: userId,
        name: userName,
        ttl: '10m',
    });

    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

    return await at.toJwt();
}
