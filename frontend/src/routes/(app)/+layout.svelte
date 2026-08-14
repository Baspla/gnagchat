<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import type { LayoutData } from "./$types";
  import VoiceProvider from "$lib/components/voice/VoiceProvider.svelte";
  import GatewayProvider from "$lib/components/gateway/GatewayProvider.svelte";
  import { chatStore } from "$lib/stores/chat-store.svelte";
  import { onMount } from "svelte";
    import ChatStoreLifecycle from "$lib/components/lifecycles/ChatStoreLifecycle.svelte";

  let {
    data,
    children,
  }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  const session = authClient.useSession();
  const user = $derived($session.data?.user ?? data.user ?? null);
</script>

{#if user}
  <VoiceProvider>
    <GatewayProvider>
      <ChatStoreLifecycle>
        {@render children()}
      </ChatStoreLifecycle>
    </GatewayProvider>
  </VoiceProvider>
{:else}
  <div class="h-screen">
    {@render children()}
  </div>
{/if}
