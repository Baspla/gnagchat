import { api } from './api';
import { sseEvent, activeRoomId, clearUnread } from './sse';
import type { ChatMessage } from '@gnagchat/shared/dto';

// ── Reactive state (module-level, shared across all importers) ──
// Wrapped in a single exported object so Svelte 5 allows property mutation
// without exporting reassigned state (which is disallowed).

export const chat = $state({
    /** List of accessible channels. */
    channels: [] as { roomId: string; name: string; createdAt: Date }[],

    /** Currently selected channel ID. */
    activeChannelId: null as string | null,

    /** Per-room message arrays, keyed by roomId. */
    messages: {} as Record<string, ChatMessage[]>,
});

// Eden treaty helper type for the chat API
const chatApi = api.chat as any;

// ── Actions ──

/**
 * Fetches the list of channels the current user has access to.
 */
export async function loadChannels() {
    const { data, error } = await chatApi.channels.get();
    if (error) {
        console.error('Failed to load channels:', error);
        return;
    }
    chat.channels.length = 0;
    if (data) {
        chat.channels.push(...(data as typeof chat.channels));
    }
}

/**
 * Creates a new channel and refreshes the channel list.
 */
export async function createChannel(name: string) {
    const { error } = await chatApi.channels.post({ name });
    if (error) {
        console.error('Failed to create channel:', error);
        return false;
    }
    await loadChannels();
    return true;
}

/**
 * Selects a channel: sets activeChannelId, loads message history, clears unread badge.
 */
export async function selectChannel(roomId: string) {
    chat.activeChannelId = roomId;
    activeRoomId.set(roomId);
    clearUnread(roomId);

    if (!chat.messages[roomId]) {
        chat.messages[roomId] = [];
    }

    const { data, error } = await chatApi.rooms({ roomId }).history.get();
    if (error) {
        console.error('Failed to load history:', error);
        return;
    }

    // API returns messages with most recent first; reverse for chronological order
    const history = (data as ChatMessage[]).slice().reverse();
    chat.messages[roomId] = history;
}

/**
 * Sends a message to the currently active channel.
 */
export async function sendMessage(content: string) {
    const roomId = chat.activeChannelId;
    if (!roomId) return;

    const { error } = await chatApi.rooms({ roomId }).messages.post({ content });
    if (error) {
        console.error('Failed to send message:', error);
    }
    // The SSE event will add the message to the list automatically
}

/**
 * Initializes SSE listener: subscribes to the global sseEvent store
 * and routes message_created events into the correct room's message array.
 */
export function initSse() {
    return sseEvent.subscribe((event) => {
        if (!event || event.event !== 'message_created') return;

        const msg = event.data as ChatMessage;

        if (!chat.messages[msg.roomId]) {
            chat.messages[msg.roomId] = [];
        }

        // Avoid duplicating if the message already exists (e.g. from optimistic send)
        const exists = chat.messages[msg.roomId].some((m) => m.id === msg.id);
        if (!exists) {
            chat.messages[msg.roomId].push(msg);
        }
    });
}