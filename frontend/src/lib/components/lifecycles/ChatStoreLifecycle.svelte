<script lang="ts">
    import VoiceProvider from "$lib/components/voice/VoiceProvider.svelte";
    import GatewayProvider from "$lib/components/gateway/GatewayProvider.svelte";
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import { channelStore } from "$lib/stores/channel-store.svelte";
    import { onDestroy, onMount } from "svelte";
    import type { Snippet } from "svelte";

    let { children }: { children: Snippet } = $props();

    let cleanups: (() => void)[] = [];

    onMount(() => {
        cleanups = [chatStore.init(), channelStore.init()];
    });

    onDestroy(() => {
        for (const cleanup of cleanups) {
            cleanup();
        }
        cleanups = [];
    });
</script>

{#if children}
    {@render children()}
{/if}
