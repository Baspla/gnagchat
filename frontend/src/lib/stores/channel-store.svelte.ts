import { getGatewayManager } from "$lib/gateway/gateway-context.svelte";
import { api } from "$lib/api";
import { chatStore } from "$lib/stores/chat-store.svelte";
import type { DtoChannel } from "$shared/dto/chat";
import type { ChannelCreatePayload, ChannelDeletePayload } from "$shared/dto/ws-message";
import { SvelteMap } from "svelte/reactivity";
import { createLogger } from "$lib/logger";
import { getErrorMessage } from "$lib/errors";

const logger = createLogger("channel-store");

// ── Reactive state ──────────────────────────────────────────────────────

const channels = $state(new SvelteMap<string, DtoChannel>());
let initialLoading = $state(false);
let loaded = $state(false);

/**
 * Cached in-flight (or completed) load promise.
 * Guarantees that all concurrent callers of `loadChannels()`
 * await the same fetch instead of resolving early.
 */
let loadPromise: Promise<void> | null = null;

// ── Internal helpers ────────────────────────────────────────────────────

function normalizeChannel(channel: DtoChannel): DtoChannel {
    return {
        ...channel,
        createdAt: channel.createdAt instanceof Date ? channel.createdAt : new Date(channel.createdAt),
    };
}

/**
 * Insert or replace a channel, deduplicating by `roomId`.
 * Used both by the REST responses and the WS `channel_create` event.
 */
function upsertChannel(incoming: DtoChannel): void {
    channels.set(incoming.roomId, normalizeChannel(incoming));
}

// ── Gateway handler cleanup references ──────────────────────────────────

let _unsubscribes: (() => void)[] | null = null;

// ── Public API ──────────────────────────────────────────────────────────

export const channelStore = {
    /**
     * Reactively get all channels, sorted oldest-first.
     */
    channels(): DtoChannel[] {
        return Array.from(channels.values()).sort(
            (a, b) => a.createdAt.valueOf() - b.createdAt.valueOf() || a.roomId.localeCompare(b.roomId),
        );
    },

    /** Get a single channel by its room id, if loaded. */
    get(roomId: string): DtoChannel | undefined {
        return channels.get(roomId);
    },

    /**
     * Fetch all accessible channels and seed the store.
     * Safe to call multiple times — concurrent callers share
     * the same in-flight fetch; a failed fetch can be retried.
     */
    loadChannels(): Promise<void> {
        if (!loadPromise) {
            loadPromise = (async () => {
                initialLoading = true;
                try {
                    const res = await api.chat.channels.get();
                    if (res.error) {
                        logger.error("failed to load channels", { error: getErrorMessage(res.error) });
                        // Allow a retry on the next call after a failure.
                        loadPromise = null;
                        return;
                    }
                    if (res.data) {
                        for (const channel of res.data) {
                            upsertChannel(channel);
                        }
                    }
                } finally {
                    loaded = true;
                    initialLoading = false;
                }
            })();
        }
        return loadPromise;
    },

    /** Whether the initial channel list is still being fetched. */
    isInitialLoading(): boolean {
        return initialLoading;
    },

    /** Whether the initial channel list has been fetched at least once. */
    isLoaded(): boolean {
        return loaded;
    },

    /**
     * Create a channel via the REST API.
     * The local map is updated from the REST response; the WS
     * `channel_create` event is then a no-op echo for this client.
     */
    async createChannel(name: string): Promise<DtoChannel | null> {
        const res = await api.chat.channels.post({ name });

        if (res.data) {
            upsertChannel(res.data);
            return res.data;
        }

        if (res.error) {
            logger.error("failed to create channel", { name, error: getErrorMessage(res.error) });
        }

        return null;
    },

    /**
     * Delete a channel via the REST API.
     * The local map is updated immediately; the WS `channel_delete`
     * event is then a no-op echo for this client.
     */
    async deleteChannel(roomId: string): Promise<boolean> {
        const res = await api.chat.channels({ roomId }).delete();

        if (res.response.ok) {
            channels.delete(roomId);
            // Purge cached messages/cursors for the deleted room
            chatStore.purgeRoom(roomId);
            return true;
        }

        if (res.error) {
            logger.error("failed to delete channel", { roomId, error: getErrorMessage(res.error) });
        }

        return false;
    },

    /**
     * Register all gateway listeners for real-time channel events.
     * Call **once** during app startup (e.g. from `+layout.svelte`).
     * Returns a cleanup function that removes all listeners.
     */
    init(): () => void {
        logger.info("initializing gateway listeners");
        if (_unsubscribes) {
            logger.warn("gateway listeners already initialized");
            return () => {};
        }

        try {
            var gw = getGatewayManager();
        } catch {
            logger.warn("gateway manager not yet available; retry after mount");
            return () => {};
        }

        _unsubscribes = [];

        // ── channel_create ──────────────────────────────────────────
        _unsubscribes.push(
            gw.on("channel_create", (data: ChannelCreatePayload) => {
                upsertChannel(data);
            }),
        );

        // ── channel_delete ──────────────────────────────────────────
        _unsubscribes.push(
            gw.on("channel_delete", (data: ChannelDeletePayload) => {
                channels.delete(data.channelId);
                // Purge cached messages/cursors for the deleted room
                chatStore.purgeRoom(data.channelId);
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