import { Elysia } from 'elysia';
import { Modules } from '@gnagchat/shared/constants';
import { authMiddleware } from '../auth';
import { createVoiceToken } from './service';
import { env } from '../../env';

export const voiceModule = new Elysia({ prefix: '/voice', name: Modules.VOICE })
    .use(authMiddleware)
    .get('/token', async ({ query, user }) => {
        const room = query?.room ?? 'default-call';
        const token = await createVoiceToken(user.id, user.name, room);
        return { token, url: env.LIVEKIT_URL };
    }, {
        auth: true
    });