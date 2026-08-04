import { Centrifuge } from 'centrifuge';
import { env } from '$env/dynamic/public';

let centrifuge: Centrifuge | null = null;

/**
 * Returns the auth token from the current session.
 * This relies on the better-auth cookie being available.
 */
function getAuthToken(): string {
    // The auth token is managed via cookies by Better Auth.
    // We pass the cookie value so Centrifugo's proxy can validate the session.
    return document.cookie;
}

/**
 * Initialize or return the Centrifugo client singleton.
 * Connects to the configured WebSocket URL with auth token in data.
 */
export function getCentrifugeClient(): Centrifuge {
    if (centrifuge) {
        return centrifuge;
    }

    const wsUrl = env.PUBLIC_CENTRIFUGO_WS_URL || 'ws://localhost:8000/connection/websocket';

    centrifuge = new Centrifuge(wsUrl, {
        data: {
            token: getAuthToken(),
        },
    });

    centrifuge.on('connected', (ctx: { client: string; transport: string }) => {
        console.log('Centrifugo connected:', ctx);
    });

    centrifuge.on('disconnected', (ctx: { code: number; reason: string }) => {
        console.log('Centrifugo disconnected:', ctx);
    });

    centrifuge.on('error', (ctx: { type: string; error: { code: number; message: string } }) => {
        console.error('Centrifugo error:', ctx);
    });

    centrifuge.connect();

    return centrifuge;
}

/**
 * Subscribe to a Centrifugo channel and return the subscription.
 * The subscription handles 'publication' events automatically.
 * Caller is responsible for calling .unsubscribe() on cleanup.
 */
export function subscribeToChannel(channel: string) {
    const client = getCentrifugeClient();
    const subscription = client.newSubscription(channel);

    subscription.on('publication', (ctx) => {
        console.log(`Publication on ${channel}:`, ctx.data);
    });

    subscription.subscribe();

    return subscription;
}

/**
 * Disconnect the Centrifugo client (e.g., on logout).
 */
export function disconnectCentrifuge(): void {
    if (centrifuge) {
        centrifuge.disconnect();
        centrifuge = null;
    }
}