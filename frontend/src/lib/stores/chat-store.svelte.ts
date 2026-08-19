import { getGatewayManager } from "$lib/gateway/gateway-context.svelte";
import { api } from "$lib/api";
import type {
    DtoChatMessage,
    DtoHistoryResponse,
    MessageCreatePayload,
    MessageUpdatePayload,
    MessageDeletePayload,
    MessageDeleteBulkPayload,
    MessageReactionAddPayload,
    MessageReactionRemovePayload,
    MessageReactionRemoveAllPayload,
    MessageReactionRemoveEmojiPayload,
} from "$shared/dto";
import { page } from "$app/state";
import { SvelteMap } from "svelte/reactivity";
import { createLogger } from "$lib/logger";
import { getErrorMessage } from "$lib/errors";

const logger = createLogger("chat-store");

// ── Reactive state ──────────────────────────────────────────────────────

const rooms = $state(new SvelteMap<string, SvelteMap<string, DtoChatMessage>>());
const nextCursors = $state(new SvelteMap<string, string | null>());
const loading = new Set<string>();
const loaded = new Set<string>();
const HISTORY_PAGE_SIZE = 50;

// ── Internal helpers ────────────────────────────────────────────────────

function ensureRoom(roomId: string): SvelteMap<string, DtoChatMessage> {
    let messages = rooms.get(roomId);
    if (!messages) {
        messages = new SvelteMap<string, DtoChatMessage>();
        rooms.set(roomId, messages);
    }
    return messages;
}

function normalizeMessage(message: DtoChatMessage): DtoChatMessage {
    return {
        ...message,
        createdAt: message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt),
        editedAt: message.editedAt
            ? message.editedAt instanceof Date ? message.editedAt : new Date(message.editedAt)
            : message.editedAt,
    };
}

const user = $derived(page.data.user ?? null);

/**
 * Insert or replace a message in a room, deduplicating by `id` and `nonce`.
 * Used both by the REST `sendMessage` response and the WS `message_create` event.
 */
function upsertMessage(roomId: string, incoming: DtoChatMessage): void {
    incoming = normalizeMessage(incoming);
    const messages = ensureRoom(roomId);

    // Replace by exact ID match (e.g. WS event replacing a stub)
    const existingById = messages.get(incoming.id);
    if (existingById) {
        messages.set(incoming.id, incoming);
        return;
    }

    // Replace by nonce match (optimistic local message replaced by server response or WS echo)
    if (incoming.nonce) {
        const existingByNonce = messages.get(incoming.nonce);
        if (existingByNonce) {
            messages.delete(incoming.nonce);
            messages.set(incoming.id, incoming);
            return;
        }
    }
    messages.set(incoming.id, incoming);
}

/**
 * Fetch a page of history and merge into the room's message map.
 * If no cursor is provided, fetches the newest page.
 */
async function loadPage(roomId: string, cursor?: string): Promise<DtoHistoryResponse | null> {
    const res = await api.chat.rooms({ roomId }).history.get({
        query: { limit: HISTORY_PAGE_SIZE, cursor },
    });

    if (res.error) {
        logger.error("failed to load history page", { roomId, error: getErrorMessage(res.error) });
        return null;
    }

    const data = res.data as DtoHistoryResponse | undefined;
    if (!data) return null;

    const messages = ensureRoom(roomId);
    for (const rawMessage of data.messages) {
        const msg = normalizeMessage(rawMessage);
        messages.set(msg.id, msg);
    }

    nextCursors.set(roomId, data.nextCursor);
    return data;
}

// ── Gateway handler cleanup references ──────────────────────────────────

let _unsubscribes: (() => void)[] | null = null;

// ── Public API ──────────────────────────────────────────────────────────

export const chatStore = {
    /**
     * Reactively get all messages for a room, sorted oldest-first.
     * Returns an empty array if no messages have been loaded yet.
     */
    messages(roomId: string): DtoChatMessage[] {
        const map = rooms.get(roomId);
        if (!map) return [];
        return Array.from(map.values()).sort(
            (a, b) => a.createdAt.valueOf() - b.createdAt.valueOf() || a.id.localeCompare(b.id),
        );
    },

    /**
     * Ensure the initial page of history has been loaded for a room.
     * Safe to call multiple times — only fetches once.
     * Merges into any messages already present (e.g. from WebSocket).
     */
    async focusRoom(roomId: string): Promise<void> {
        if (loaded.has(roomId)) return;
        loaded.add(roomId);
        await loadPage(roomId);
    },

    /**
     * Load older messages (previous page) for a room.
     * Returns true if there may be more pages, false if exhausted.
     */
    async loadOlder(roomId: string): Promise<boolean> {
        if (loading.has(roomId)) return false;

        const cursor = nextCursors.get(roomId);
        if (cursor === null) return false; // null = exhausted, undefined = not loaded yet

        loading.add(roomId);
        try {
            const data = await loadPage(roomId, cursor);
            return data?.hasMore ?? false;
        } finally {
            loading.delete(roomId);
        }
    },

    /**
     * Send a message via the REST API.
     * Adds an optimistic stub locally so the UI updates immediately.
     * The stub is reconciled either by the REST response or by the WS `message_create` event.
     */
    async sendMessage(roomId: string, content: string): Promise<DtoChatMessage | null> {
        if (content.trim() === "") {
            logger.warn("attempted to send empty message", { roomId });
            return null;
        }
        const nonce = crypto.randomUUID();

        const optimistic: DtoChatMessage = {
            id: "",
            roomId,
            author: {
                id: "",
                displayName: user?.name || "Unknown",
                avatarUrl: user?.image || "",
            },
            content,
            createdAt: new Date(),
            editedAt: null,
            mentions: null,
            emojis: null,
            reactions: null,
            nonce,
            pinned: false,
            type: "text",
        };

        ensureRoom(roomId).set(nonce, optimistic);

        const res = await api.chat.rooms({ roomId }).messages.post({ content, nonce });

        if (res.data) {
            const incoming = { ...res.data, nonce } as unknown as DtoChatMessage;
            upsertMessage(roomId, incoming);
            return incoming;
        }

        if (res.error) {
            // Remove the optimistic stub on failure
            const messages = rooms.get(roomId);
            if (messages) {
                messages.delete(nonce);
            }
            logger.error("failed to send message", { roomId, error: getErrorMessage(res.error) });
        }

        return null;
    },

    /**
     * Register all gateway listeners for real-time message and reaction events.
     * Call **once** during app startup (e.g. from `+layout.svelte`).
     * Returns a cleanup function that removes all listeners.
     */
    init(): () => void {
        logger.info("initializing gateway listeners");
        if (_unsubscribes) {
            logger.warn("gateway listeners already initialized");
            return () => { };
        }

        try {
            var gw = getGatewayManager();
        } catch {
            logger.warn("gateway manager not yet available; retry after mount");
            return () => { };
        }

        _unsubscribes = [];

        // ── message_create ──────────────────────────────────────────
        _unsubscribes.push(
            gw.on("message_create", (data: MessageCreatePayload) => {
                upsertMessage(data.roomId, data);
            }),
        );

        // ── message_update ──────────────────────────────────────────
        _unsubscribes.push(
            gw.on("message_update", (data: MessageUpdatePayload) => {
                // The WS payload only carries messageId + roomId.
                // A follow-up fetch or an extended payload would be needed
                // for full content updates. We mark the message as edited.
                const messages = rooms.get(data.roomId);
                if (messages) {
                    const msg = messages.get(data.messageId);
                    if (msg) {
                        msg.editedAt = new Date();
                    }
                }
            }),
        );

        // ── message_delete ──────────────────────────────────────────
        _unsubscribes.push(
            gw.on("message_delete", (data: MessageDeletePayload) => {
                const messages = rooms.get(data.roomId);
                if (messages) {
                    messages.delete(data.messageId);
                }
            }),
        );

        // ── message_delete_bulk ─────────────────────────────────────
        _unsubscribes.push(
            gw.on("message_delete_bulk", (data: MessageDeleteBulkPayload) => {
                const messages = rooms.get(data.roomId);
                if (messages) {
                    const ids = new Set(data.messageIds);
                    rooms.set(data.roomId, new SvelteMap([...messages].filter(([id]) => !ids.has(id))));
                }
            }),
        );

        // ── message_reaction_add ────────────────────────────────────
        _unsubscribes.push(
            gw.on("message_reaction_add", (data: MessageReactionAddPayload) => {
                const messages = rooms.get(data.roomId);
                if (messages) {
                    const msg = messages.get(data.messageId);
                    if (msg) {
                        if (!msg.reactions) msg.reactions = [];
                        // update the count for the emoji if it already exists, otherwise add a new reaction
                        const existing = msg.reactions.find((r) => r.emoji === data.emoji);
                        if (existing) {
                            existing.count += 1;
                        } else {
                            msg.reactions.push({ emoji: data.emoji, count: 1 });
                        }
                    }
                }

            }),
        );

        // ── message_reaction_remove ─────────────────────────────────
        _unsubscribes.push(
            gw.on("message_reaction_remove", (data: MessageReactionRemovePayload) => {
                const messages = rooms.get(data.roomId);
                if (messages) {
                    const msg = messages.get(data.messageId);
                    if (msg && msg.reactions) {
                        const existing = msg.reactions.find((r) => r.emoji === data.emoji);
                        if (existing) {
                            existing.count -= 1;
                            if (existing.count <= 0) {
                                msg.reactions = msg.reactions.filter((r) => r.emoji !== data.emoji);
                            }
                        }
                    }
                }
            }),
        );

        // ── message_reaction_remove_all ─────────────────────────────
        _unsubscribes.push(
            gw.on("message_reaction_remove_all", (data: MessageReactionRemoveAllPayload) => {
                const messages = rooms.get(data.roomId);
                if (messages) {
                    const msg = messages.get(data.messageId);
                    if (msg) {
                        msg.reactions = [];
                    }
                }
            }),
        );

        // ── message_reaction_remove_emoji ───────────────────────────
        _unsubscribes.push(
            gw.on("message_reaction_remove_emoji", (data: MessageReactionRemoveEmojiPayload) => {
                const messages = rooms.get(data.roomId);
                if (messages) {
                    const msg = messages.get(data.messageId);
                    if (msg && msg.reactions) {
                        msg.reactions = msg.reactions.filter((r) => r.emoji !== data.emoji);
                    }
                }
            }),
        );

        return () => {
            _unsubscribes?.forEach((fn) => fn());
            _unsubscribes = null;
        };
    },

    /**
     * Whether gateway listeners have been registered.
     */
    get initialized(): boolean {
        return _unsubscribes !== null;
    },
};