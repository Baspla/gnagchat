<script lang="ts">
    import { authClient } from "$lib/auth-client";
    import VoiceProvider from "$lib/components/voice/VoiceProvider.svelte";
    import GatewayProvider from "$lib/components/gateway/GatewayProvider.svelte";
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import { onDestroy, onMount } from "svelte";
    import type { Snippet } from "svelte";

    let { children }: { children: Snippet } = $props();

    let cleanup: (() => void) | null = null;

    onMount(() => {
        cleanup = chatStore.init();
    });

    onDestroy(() => {
        if (cleanup) {
            cleanup();
        }
    });
</script>

{#if children}
    {@render children()}
{/if}
