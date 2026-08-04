import { env } from '$env/dynamic/public';
export type ChatMessage = {
    id: string;
    roomId: string;
    userId: string;
    content: string;
    createdAt: Date;
};

export type WSIncomingMessage =
    | { type: 'chat_message'; data: ChatMessage }
    | { type: 'typing_indicator'; userId: string; isTyping: boolean }
    | { type: 'system'; message: string }
    | { type: 'pong' }
    | { type: 'error'; message: string }
    | { type: 'room_activity'; roomId: string; message: ChatMessage };

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';


class AppWebSocketManager {
    private ws: WebSocket | null = $state(null);
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private listeners = new Map<string, Set<(msg: WSIncomingMessage) => void>>();
    private subscribedRooms = new Set<string>();

    connectionState = $state<WSConnectionState>('disconnected');
    lastError = $state<string | null>(null);

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.connectionState = 'connecting';
        this.lastError = null;

        const wsUrl = (env.PUBLIC_VITE_API_URL || 'http://localhost:3000')
            .replace(/^http/, 'ws') + '/api/v1/ws';

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.connectionState = 'connected';
                this.lastError = null;

                // Re-subscribe to all previously subscribed rooms after reconnect
                for (const roomId of this.subscribedRooms) {
                    this.send({ type: 'subscribe', topic: `room:${roomId}` });
                }

                // Start ping interval
                this.pingInterval = setInterval(() => {
                    this.send({ type: 'ping' });
                }, 30_000);
            };

            this.ws.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data) as WSIncomingMessage;
                    this.routeMessage(data);
                } catch (e) {
                    console.error('[AppWS] Failed to parse message:', e);
                }
            };

            this.ws.onclose = () => {
                this.connectionState = 'disconnected';
                this.cleanup();
                this.scheduleReconnect();
            };

            this.ws.onerror = () => {
                this.lastError = 'WebSocket connection error';
                this.connectionState = 'error';
            };
        } catch (e) {
            this.lastError = 'Failed to create WebSocket connection';
            this.connectionState = 'error';
            this.scheduleReconnect();
        }
    }

    disconnect() {
        this.cleanup();
        this.ws?.close();
        this.ws = null;
        this.connectionState = 'disconnected';
        this.subscribedRooms.clear();
        this.listeners.clear();
    }

    send(payload: Record<string, unknown>) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        }
    }

    subscribe(roomId: string) {
        this.subscribedRooms.add(roomId);
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.send({ type: 'subscribe', topic: `room:${roomId}` });
        }
    }

    unsubscribe(roomId: string) {
        this.subscribedRooms.delete(roomId);
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.send({ type: 'unsubscribe', topic: `room:${roomId}` });
        }
    }

    onMessage(roomId: string, callback: (msg: WSIncomingMessage) => void) {
        if (!this.listeners.has(roomId)) {
            this.listeners.set(roomId, new Set());
        }
        this.listeners.get(roomId)!.add(callback);
    }

    offMessage(roomId: string, callback: (msg: WSIncomingMessage) => void) {
        this.listeners.get(roomId)?.delete(callback);
    }

    private routeMessage(msg: WSIncomingMessage) {
        let roomId: string | null = null;

        if (msg.type === 'chat_message') {
            roomId = msg.data.roomId;
        } else if (msg.type === 'room_activity') {
            roomId = msg.roomId;
        }

        if (roomId) {
            const listeners = this.listeners.get(roomId);
            if (listeners) {
                for (const cb of listeners) {
                    cb(msg);
                }
            }
        }

        // Also notify general listeners (no roomId filter, e.g. for typing indicators)
        const generalListeners = this.listeners.get('__all__');
        if (generalListeners) {
            for (const cb of generalListeners) {
                cb(msg);
            }
        }
    }

    private cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 3000);
    }
}

export const appWebSocket = new AppWebSocketManager();