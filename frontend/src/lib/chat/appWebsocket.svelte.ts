import { api } from '$lib/api';
import type { ChatMessage, WSIncomingMessage } from '@gnagchat/shared/dto';

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';


class AppWebSocketManager {
    private ws: WebSocket | null = $state(null);
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

        try {
            // Use Eden Treaty's subscribe method which returns an EdenWS (extends WebSocket)
            const edenWs = api.ws.subscribe();

            // Access the raw native WebSocket for full control
            this.ws = 'raw' in edenWs ? (edenWs as any).raw : (edenWs as unknown as WebSocket);

            edenWs.addEventListener('open', () => {
                this.connectionState = 'connected';
                this.lastError = null;

                // Re-subscribe to all previously subscribed rooms after reconnect
                for (const roomId of this.subscribedRooms) {
                    this.send({ type: 'subscribe', topic: `room:${roomId}` });
                }
            });

            edenWs.addEventListener('message', (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data) as WSIncomingMessage;
                    this.routeMessage(data);
                } catch (e) {
                    console.error('[AppWS] Failed to parse message:', e);
                }
            });

            edenWs.addEventListener('close', () => {
                this.connectionState = 'disconnected';
                this.ws = null;
            });

            edenWs.addEventListener('error', () => {
                this.lastError = 'WebSocket connection error';
                this.connectionState = 'error';
            });
        } catch (e) {
            this.lastError = 'Failed to create WebSocket connection';
            this.connectionState = 'error';
        }
    }

    disconnect() {
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
}

export const appWebSocket = new AppWebSocketManager();