<script lang="ts">
    import { createVirtualizer } from "@tanstack/svelte-virtual";
    import { get } from "svelte/store";
    import type { DtoChatMessage } from "$shared/dto";
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import ChatMessage from "./ChatMessage.svelte";
    import DayDivider from "./DayDivider.svelte";

    let {
        messages,
        roomId,
        initialLoading,
    }: {
        messages: DtoChatMessage[];
        roomId: string;
        initialLoading: boolean;
    } = $props();

    let parentRef = $state<HTMLDivElement | null>(null);
    let hasScrolledToEnd = $state(false);
    let initialPositioned = $state(false);
    let loadingOlder = $state(false);
    let hasMoreOlder = $state(true);

    // During a channel switch the core can briefly ask for a key from the
    // previous range after the new array has been applied. Real messages
    // always use their stable ID; the fallback is only for that transient
    // out-of-range lookup.
    const getMessageKey = (index: number) => messages[index]?.id ?? `stale-message-${index}`;

    function isNewDay(index: number): boolean {
        if (index === 0) return true;

        const current = messages[index];
        const previous = messages[index - 1];
        if (!current || !previous) return false;

        return (
            current.createdAt.getFullYear() !== previous.createdAt.getFullYear() ||
            current.createdAt.getMonth() !== previous.createdAt.getMonth() ||
            current.createdAt.getDate() !== previous.createdAt.getDate()
        );
    }

    const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
        count: 0,
        getScrollElement: () => parentRef,
        estimateSize: () => 72,
        getItemKey: getMessageKey,
        anchorTo: "end",
        followOnAppend: true,
        scrollEndThreshold: 80,
        overscan: 6,
    });

    function measureElement(node: HTMLDivElement) {
        $virtualizer.measureElement(node);
    }

    function jumpToLatest() {
        $virtualizer.scrollToEnd({ behavior: "smooth" });
    }

    async function loadOlderMessages() {
        if (loadingOlder || !hasMoreOlder || messages.length === 0) return;

        loadingOlder = true;
        try {
            hasMoreOlder = await chatStore.loadOlder(roomId);
        } finally {
            loadingOlder = false;
        }
    }

    // Keep the virtualizer's item count and key resolver in sync with the
    // oldest-first message array. TanStack Virtual preserves the keyed item
    // position when older messages are prepended.
    $effect(() => {
        const count = messages.length;
        get(virtualizer).setOptions({
            count,
            getItemKey: getMessageKey,
        });
    });

    // A channel switch reuses this component instance. Reset only the
    // channel-local pagination and initial-position state; the old virtual
    // range may still be published for one update while the new array lands.
    $effect(() => {
        roomId;
        hasScrolledToEnd = false;
        initialPositioned = false;
        hasMoreOlder = true;
    });

    // Chat screens open at the newest message. Follow-on appends are handled
    // by the virtualizer itself after this initial positioning.
    $effect(() => {
        if (!initialLoading && !hasScrolledToEnd && messages.length > 0 && parentRef) {
            const targetRoomId = roomId;
            hasScrolledToEnd = true;

            // Dynamic message heights are measured as their virtual items
            // mount. Re-align while those first measurements settle so the
            // initial position is the true end, rather than the estimate.
            const alignToEnd = (frame: number) => {
                if (roomId !== targetRoomId || !parentRef || messages.length === 0) return;

                get(virtualizer).scrollToEnd();
                parentRef.scrollTop = parentRef.scrollHeight;
                if (frame < 4) {
                    requestAnimationFrame(() => alignToEnd(frame + 1));
                } else {
                    initialPositioned = true;
                }
            };

            requestAnimationFrame(() => {
                alignToEnd(0);
            });
        }
    });

    // Loading is intentionally kept outside the virtualizer: prepending to
    // `messages` lets anchorTo:'end' retain the user's visible keyed message.
    $effect(() => {
        if (initialLoading) return;
        const firstVirtualItem = $virtualizer.getVirtualItems()[0];
        if (firstVirtualItem && firstVirtualItem.index <= 2) {
            void loadOlderMessages();
        }
    });
</script>

<div class="relative min-h-0 flex-1">
    <div
        bind:this={parentRef}
        class="h-full min-h-0 overflow-auto p-3"
        aria-label="Chat messages"
    >
        <div
            class="relative w-full"
            style:height={`${$virtualizer.getTotalSize()}px`}
        >
            {#each $virtualizer.getVirtualItems() as virtualItem (virtualItem.key)}
                {#if messages[virtualItem.index]}
                    <div
                        use:measureElement
                        data-index={virtualItem.index}
                        class="absolute top-0 w-full"
                        style:transform={`translateY(${virtualItem.start}px)`}
                    >
                        {#if isNewDay(virtualItem.index)}
                            <DayDivider timestamp={messages[virtualItem.index]!.createdAt} />
                        {/if}
                        <ChatMessage message={messages[virtualItem.index]!} />
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    {#if initialPositioned && !$virtualizer.isAtEnd()}
        <button
            type="button"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
            onclick={jumpToLatest}
        >
            Neueste Nachrichten
        </button>
    {/if}

    {#if loadingOlder}
        <div class="pointer-events-none absolute left-0 right-0 top-2 text-center text-sm text-gray-500">
            Ältere Nachrichten werden geladen …
        </div>
    {/if}
</div>
