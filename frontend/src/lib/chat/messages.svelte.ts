import { api } from '$lib/api';
import { appWebSocket } from './appWebsocket.svelte';
import type { ChatMessage, WSIncomingMessage } from './appWebsocket.svelte';

export class ChatMessages {
    roomId: string;

    onNewMessage: ((msg: ChatMessage) => void) | null = null;

    messages = $state<ChatMessage[]>([]);
    loading = $state(true);
    sending = $state(false);
    error = $state<string | null>(null);

    private onMessageBound: ((msg: WSIncomingMessage) => void) | null = null;

    constructor(roomId: string) {
        this.roomId = roomId;
    }

    async connect() {
        // Ensure the singleton WS is connected
        appWebSocket.connect();

        // Subscribe to this room
        appWebSocket.subscribe(this.roomId);

        // Register message handler
        this.onMessageBound = (msg: WSIncomingMessage) => {
            if (msg.type === 'chat_message' && msg.data.roomId === this.roomId) {
                this.handleIncomingMessage(msg.data);
            }
        };
        appWebSocket.onMessage(this.roomId, this.onMessageBound);

        await this.loadHistory();
    }

    disconnect() {
        if (this.onMessageBound) {
            appWebSocket.offMessage(this.roomId, this.onMessageBound);
            this.onMessageBound = null;
        }
        appWebSocket.unsubscribe(this.roomId);
    }

    private async loadHistory() {
        this.loading = true;
        this.error = null;

        try {
            const response = await api.chat.rooms({ roomId: this.roomId }).history.get({
                query: { limit: 50 }
            });

            if (response.error) {
                this.error = 'Failed to load messages';
                return;
            }

            // The API returns newest first, but we want oldest first for display
            this.messages = ((response.data ?? []) as ChatMessage[]).reverse();
        } catch (e: any) {
            this.error = e.message || 'Failed to load messages';
        } finally {
            this.loading = false;
        }
    }

    async sendMessage(content: string): Promise<boolean> {
        if (!content.trim()) return false;

        this.sending = true;
        this.error = null;

        try {
            const response = await api.chat.rooms({ roomId: this.roomId }).messages.post({
                content: content.trim()
            });

            if (response.error) {
                console.error('Failed to send message:', response.error);
                this.error = 'Failed to send message';
                return false;
            }

            // The message is added via WebSocket echo, no need to push manually
            return true;
        } catch (e: any) {
            this.error = e.message || 'Failed to send message';
            return false;
        } finally {
            this.sending = false;
        }
    }

    private handleIncomingMessage(msg: ChatMessage) {
        // Avoid duplicates by checking if we already have this message ID
        const exists = this.messages.some(m => m.id === msg.id);
        if (!exists) {
            this.messages = [...this.messages, msg];
            this.onNewMessage?.(msg);
        }
    }
}