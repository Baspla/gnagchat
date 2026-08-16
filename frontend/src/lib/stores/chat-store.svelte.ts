import { getGatewayManager } from "$lib/gateway/gateway-context.svelte";
import { api } from "$lib/api";
import type {
    DtoChatMessage,
    MessageCreatePayload,
    MessageUpdatePayload,
    MessageDeletePayload,
    MessageDeleteBulkPayload,
    MessageReactionAddPayload,
    MessageReactionRemovePayload,
    MessageReactionRemoveAllPayload,
    MessageReactionRemoveEmojiPayload,
} from "$shared/dto";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { authClient } from "$lib/auth-client";
import { createLogger } from "$lib/logger";
import { getErrorMessage } from "$lib/errors";

const logger = createLogger("chat-store");

// ── Reactive state ──────────────────────────────────────────────────────

const rooms = $state(new SvelteMap<string, SvelteMap<string, DtoChatMessage>>());

// ── Internal helpers ────────────────────────────────────────────────────

function ensureRoom(roomId: string): SvelteMap<string, DtoChatMessage> {
    let messages = rooms.get(roomId);
    if (!messages) {
        messages = new SvelteMap<string, DtoChatMessage>();
        rooms.set(roomId, messages);
    }
    return messages;
}


const session = authClient.useSession();
const user = $derived(session.get().data?.user ?? null);

/**
 * Insert or replace a message in a room, deduplicating by `id` and `nonce`.
 * Used both by the REST `sendMessage` response and the WS `message_create` event.
 */
function upsertMessage(roomId: string, incoming: DtoChatMessage): void {
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

// ── Gateway handler cleanup references ──────────────────────────────────

let _unsubscribes: (() => void)[] | null = null;

// ── Public API ──────────────────────────────────────────────────────────

export const chatStore = {
    /**
     * Reactively get all messages for a room.
     * Returns an empty array if no messages have been loaded yet.
     */
    messages(roomId: string): DtoChatMessage[] {
        return Array.from(rooms.get(roomId)?.values() ?? []);
    },

    /**
     * Load message history from the backend API and replace local state
     * for the given room.
     */
    async loadHistory(roomId: string): Promise<void> {
        logger.debug("loading history", { roomId });
        const res = await api.chat.rooms({ roomId }).history.get({
            query: { limit: 50 },
        });

        if (res.data && Array.isArray(res.data)) {
            logger.debug("loaded messages", { roomId, count: res.data.length });
            const messageMap = new SvelteMap<string, DtoChatMessage>();
            for (const msg of res.data) {
                messageMap.set(msg.id, msg);
            }
            rooms.set(roomId, messageMap);
        } else if (res.error) {
            logger.error("failed to load history", { roomId, error: getErrorMessage(res.error) });
        }
    },

    /**
     * Called when the user looks at a room, if the store has not yet been initialized for that room go and load the history.
     */
    async focusedRoom(roomId: string): Promise<void> {
        if (!rooms.has(roomId)) {
            await this.loadHistory(roomId);
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