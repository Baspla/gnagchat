import { AccessToken } from 'livekit-server-sdk';
import { env } from '../../env';
import type { User } from 'better-auth';
import { createLogger } from '../../lib/logger';
import { ok, err, type Result, type InternalError } from '../../lib/result';

const logger = createLogger('livekit');

export async function generateLiveKitToken(user: User, deviceId: string, room: string): Promise<Result<string, InternalError>> {
    try {
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

        return ok(await at.toJwt());
    } catch (e) {
        logger.error('failed to generate livekit token', { userId: user.id, room, error: String(e) });
        return err({ status: 500, code: 'INTERNAL_ERROR', message: 'Failed to generate voice token' });
    }
}