import { env } from '../../env';

export class CentrifugoService {
    private static centrifugoUrl = env.CENTRIFUGO_URL;
    private static apiKey = env.CENTRIFUGO_API_KEY;

    static async publishToCentrifugo(channel: string, eventType: string, payload: any): Promise<void> {
        if (!this.apiKey) {
            console.warn('CENTRIFUGO_API_KEY not set, skipping publish');
            return;
        }

        try {
            const response = await fetch(`${this.centrifugoUrl}/api/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify({
                    channel,
                    data: {
                        type: eventType,
                        payload,
                    },
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`Centrifugo publish failed (${response.status}): ${text}`);
                return;
            }

            const result = await response.json();
            console.log(`Centrifugo publish to ${channel} (${eventType}):`, result);
        } catch (error) {
            console.error('Centrifugo publish error:', error);
        }
    }
}