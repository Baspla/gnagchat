// Keep test imports deterministic and prevent tests from touching deployment data.
import { mock } from 'bun:test';

process.env.GNAGCHAT_DATABASE_URL = ':memory:';
process.env.GNAGCHAT_OAUTH_DISCOVERY_URL = 'https://issuer.example/.well-known/openid-configuration';
process.env.GNAGCHAT_OAUTH_CLIENT_ID = 'test-client';
process.env.GNAGCHAT_OAUTH_CLIENT_SECRET = 'test-secret';
process.env.GNAGCHAT_BETTER_AUTH_SECRET = 'test-secret-that-is-long-enough-for-auth';
process.env.GNAGCHAT_LOG_LEVEL = 'error';

let session: unknown = null;
const getSession = mock(async () => session);

mock.module('../modules/auth/service', () => ({
    auth: {
        handler: async () => new Response('mock auth handler'),
        api: { getSession },
    },
}));

// Exported for the route tests to control authenticated/unauthenticated requests.
export function setTestSession(value: unknown) {
    session = value;
}