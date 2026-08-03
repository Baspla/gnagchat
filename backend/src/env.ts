const readEnv = (key: string): string | undefined => {
    const value = process.env[key]?.trim();
    return value && value.length > 0 ? value : undefined;
};

const requireEnv = (key: string): string => {
    const value = readEnv(key);
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const oauthDiscoveryUrl = readEnv('OAUTH_DISCOVERY_URL');
const oauthClientId = readEnv('OAUTH_CLIENT_ID');
const oauthClientSecret = readEnv('OAUTH_CLIENT_SECRET');

if (!oauthDiscoveryUrl || !oauthClientId || !oauthClientSecret) {
    throw new Error(
        'Incomplete OAuth configuration. Set OAUTH_DISCOVERY_URL, OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET together.'
    );
}

export const env = {
    DATABASE_URL: requireEnv('DATABASE_URL'),
    BETTER_AUTH_URL: readEnv('BETTER_AUTH_URL') ?? 'http://localhost:5173',
    OAUTH_PROVIDER_ID: readEnv('OAUTH_PROVIDER_ID') ?? 'generic-oauth',
    OAUTH_DISCOVERY_URL: oauthDiscoveryUrl,
    OAUTH_CLIENT_ID: oauthClientId,
    OAUTH_CLIENT_SECRET: oauthClientSecret,
    API_URL_INTERNAL: readEnv('VITE_API_URL_INTERNAL') ?? 'http://localhost:3000/api',
};
