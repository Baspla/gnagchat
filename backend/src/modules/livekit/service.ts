import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../env';

export async function generateLiveKitToken(userId: string, deviceId: string, userName: string, room: string): Promise<string> {
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: userId+":"+deviceId,
        name: userName,
        ttl: '10m',
        attributes: {
            userId: userId,
            deviceId: deviceId,
        }
    });

    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

    return await at.toJwt();
}
