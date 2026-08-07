import { writable, get } from 'svelte/store';
import { api } from './api';
import type { SseEvent } from '@gnagchat/shared/dto';

/**
 * Reactive store holding the latest SSE event received.
 * Components can subscribe to this to react to real-time updates.
 */
export const sseEvent = writable<SseEvent | null>(null);

/**
 * Tracks the currently active room ID.
 * The frontend evaluates `event.data.roomId === activeRoomId`
 * to decide whether to render the message or increment an unread badge.
 */
export const activeRoomId = writable<string | null>(null);

/**
 * Per-room unread message counters.
 * Keyed by roomId, incremented when a message arrives for a non-active room.
 */
export const unreadCounts = writable<Record<string, number>>({});

let streamActive = false;

/**
 * Connects to the SSE gateway and routes events to the reactive stores.
 * The browser handles reconnection natively via EventSource semantics.
 */
export async function connectToGateway() {
    if (streamActive) return;
    streamActive = true;

    const { data, error } = await api.gateway.get();

    if (error) {
        console.error('Gateway connection failed:', error);
        streamActive = false;
        return;
    }

    try {
        for await (const chunk of data) {
            const event = chunk as SseEvent;
            sseEvent.set(event);
            console.log('Received SSE event:', event);

            if (event.event === 'message_created') {
                const msg = event.data;
                const currentRoom = get(activeRoomId);

                if (msg.roomId === currentRoom) {
                    // Render message to chat box (handled by components)
                } else {
                    // Increment unread badge for this room
                    unreadCounts.update(counts => ({
                        ...counts,
                        [msg.roomId]: (counts[msg.roomId] ?? 0) + 1,
                    }));
                }
            }
        }
    } catch (err) {
        console.log('Stream disconnected.');
    } finally {
        streamActive = false;
    }
}

/**
 * Clears the unread counter for a room (e.g. when the user opens it).
 */
export function clearUnread(roomId: string) {
    unreadCounts.update(counts => {
        const next = { ...counts };
        delete next[roomId];
        return next;
    });
}