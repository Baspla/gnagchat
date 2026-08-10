import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../env';
import { User } from 'better-auth';

export async function generateLiveKitToken(user: User, deviceId: string, room: string): Promise<string> {
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: user.id+":"+deviceId,
        name: user.name,
        ttl: '10m',
        attributes: {
            userId: user.id,
            deviceId: deviceId,
            image: user.image || '',
        }
    });

    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

    return await at.toJwt();
}
