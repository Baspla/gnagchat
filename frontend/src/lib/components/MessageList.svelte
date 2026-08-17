<script lang="ts">
    import { createVirtualizer, type SvelteVirtualizer } from "@tanstack/svelte-virtual";
    import type { DtoChatMessage } from "$shared/dto";
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import ChatMessage from "./ChatMessage.svelte";
    import DayDivider from "./DayDivider.svelte";

    type MessageRow = { type: "message"; key: string; message: DtoChatMessage };
    type DividerRow = { type: "divider"; key: string; timestamp: Date };
    type Row = MessageRow | DividerRow;
    type VirtualizerView = Pick<SvelteVirtualizer<HTMLElement, HTMLElement>, "getVirtualItems" | "getTotalSize" | "isAtEnd">;

    let { messages, roomId }: { messages: DtoChatMessage[]; roomId: string } = $props();
    let scrollElement = $state<HTMLElement | null>(null);
    let virtualizer = $state<SvelteVirtualizer<HTMLElement, HTMLElement> | null>(null);
    let virtualItems = $state<ReturnType<SvelteVirtualizer<HTMLElement, HTMLElement>["getVirtualItems"]>>([]);
    let totalSize = $state(0);
    let atEnd = $state(true);
    let loadingOlder = $state(false);
    let olderHistoryExhausted = $state(false);
    let initializedRoom = $state<string | null>(null);

    function updateVirtualizerView(instance: VirtualizerView): void {
        virtualItems = instance.getVirtualItems();
        totalSize = instance.getTotalSize();
        atEnd = instance.isAtEnd(80);
    }

    function isSameDay(first: Date, second: Date): boolean {
        return first.getFullYear() === second.getFullYear()
            && first.getMonth() === second.getMonth()
            && first.getDate() === second.getDate();
    }

    function messageKey(message: DtoChatMessage): string {
        // Keep an optimistic message and its server response as the same
        // virtual item. The nonce is preserved by sendMessage during
        // reconciliation; history messages fall back to their database id.
        return message.nonce || message.id;
    }

    // Build the complete virtualized row model once per message-list update.
    let rows = $derived.by<Row[]>(() => {
        const result: Row[] = [];
        for (const [index, message] of messages.entries()) {
            if (index === 0 || !isSameDay(messages[index - 1]!.createdAt, message.createdAt)) {
                result.push({ type: "divider", key: `divider-${message.createdAt.toISOString()}`, timestamp: message.createdAt });
            }
            result.push({ type: "message", key: messageKey(message), message });
        }
        return result;
    });

    $effect(() => {
        if (!scrollElement || virtualizer) return;
        const store = createVirtualizer<HTMLElement, HTMLElement>({
            count: rows.length,
            getScrollElement: () => scrollElement,
            estimateSize: (index) => rows[index]?.type === "divider" ? 40 : 72,
            getItemKey: (index) => rows[index]?.key ?? index,
            anchorTo: "end",
            followOnAppend: true,
            scrollEndThreshold: 80,
            overscan: 6,
            onChange: (instance) => updateVirtualizerView(instance),
        });
        return store.subscribe((instance) => {
            virtualizer = instance;
            updateVirtualizerView(instance);
        });
    });

    $effect(() => {
        if (!virtualizer) return;
        virtualizer.setOptions({
            count: rows.length,
            getItemKey: (index) => rows[index]?.key ?? index,
            estimateSize: (index) => rows[index]?.type === "divider" ? 40 : 72,
            onChange: (instance) => updateVirtualizerView(instance),
        });
        updateVirtualizerView(virtualizer);
    });

    function measureElement(element: HTMLElement): void {
        virtualizer?.measureElement(element);
    }

    $effect(() => {
        if (initializedRoom !== roomId) {
            initializedRoom = null;
            olderHistoryExhausted = false;
        }
        if (!virtualizer || olderHistoryExhausted || loadingOlder || !virtualItems.some((item) => item.index === 0)) return;
        loadingOlder = true;
        chatStore.loadOlderMessages(roomId).then((hasMore) => {
            if (!hasMore) olderHistoryExhausted = true;
        }).finally(() => loadingOlder = false);
    });

    // Initial positioning is intentionally imperative. Appends and dynamic
    // streaming heights are handled by anchorTo/followOnAppend above.
    $effect(() => {
        if (initializedRoom === roomId || !virtualizer || rows.length === 0) return;
        initializedRoom = roomId;
        requestAnimationFrame(() => virtualizer?.scrollToEnd());
    });
</script>

<div bind:this={scrollElement} class="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
    {#if loadingOlder}
        <div class="pointer-events-none absolute inset-x-0 top-2 z-10 text-center text-sm text-surface-500">
            Ältere Nachrichten werden geladen …
        </div>
    {/if}
    <div class="relative w-full" style:height={`${totalSize}px`}>
        {#each virtualItems as virtualItem (virtualItem.key)}
            {@const row = rows[virtualItem.index]}
            {#if row}
                <div
                    data-index={virtualItem.index}
                    use:measureElement
                    class="absolute left-0 top-0 w-full px-4"
                    style:transform={`translateY(${virtualItem.start}px)`}
                >
                    {#if row.type === "divider"}
                        <DayDivider timestamp={row.timestamp} />
                    {:else}
                        <ChatMessage message={row.message} />
                    {/if}
                </div>
            {/if}
        {/each}
    </div>
    {#if !atEnd && rows.length > 0}
        <button class="btn preset-filled fixed bottom-20 right-8 z-20 rounded-full shadow-lg" onclick={() => virtualizer?.scrollToEnd({ behavior: "smooth" })}>
            Zur neuesten Nachricht
        </button>
    {/if}
</div>
