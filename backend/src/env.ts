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

const oauthDiscoveryUrl = readEnv('GNAGCHAT_OAUTH_DISCOVERY_URL');
const oauthClientId = readEnv('GNAGCHAT_OAUTH_CLIENT_ID');
const oauthClientSecret = readEnv('GNAGCHAT_OAUTH_CLIENT_SECRET');

if (!oauthDiscoveryUrl || !oauthClientId || !oauthClientSecret) {
    throw new Error(
        'Incomplete OAuth configuration. Set GNAGCHAT_OAUTH_DISCOVERY_URL, GNAGCHAT_OAUTH_CLIENT_ID and GNAGCHAT_OAUTH_CLIENT_SECRET together.'
    );
}

export const env = {
    DATABASE_URL: requireEnv('GNAGCHAT_DATABASE_URL'),
    BETTER_AUTH_URL: readEnv('GNAGCHAT_BETTER_AUTH_URL') ?? 'http://localhost:5173',
    BETTER_AUTH_SECRET: readEnv('GNAGCHAT_BETTER_AUTH_SECRET') ?? '',
    OAUTH_PROVIDER_ID: readEnv('GNAGCHAT_OAUTH_PROVIDER_ID') ?? 'generic-oauth',
    OAUTH_DISCOVERY_URL: oauthDiscoveryUrl,
    OAUTH_CLIENT_ID: oauthClientId,
    OAUTH_CLIENT_SECRET: oauthClientSecret,
    API_URL_INTERNAL: readEnv('GNAGCHAT_API_URL_INTERNAL') ?? 'http://localhost:3000/api',
    LIVEKIT_API_KEY: readEnv('LIVEKIT_API_KEY') ?? 'devkey',
    LIVEKIT_API_SECRET: readEnv('LIVEKIT_API_SECRET') ?? 'devsecret',
    LIVEKIT_URL: readEnv('LIVEKIT_URL') ?? 'http://localhost:7880',
    CENTRIFUGO_URL: readEnv('GNAGCHAT_CENTRIFUGO_URL') ?? 'http://localhost:8000',
    CENTRIFUGO_SECRET: readEnv('GNAGCHAT_CENTRIFUGO_JWT_SECRET') ?? 'default_secret',
    CENTRIFUGO_API_KEY: readEnv('GNAGCHAT_CENTRIFUGO_API_KEY') ?? 'default_http_api_key',
    DISCORD_WEBHOOK_URL: readEnv('GNAGCHAT_DISCORD_WEBHOOK_URL') ?? '',
    LOG_LEVEL: readEnv('GNAGCHAT_LOG_LEVEL') ?? 'info',
};
