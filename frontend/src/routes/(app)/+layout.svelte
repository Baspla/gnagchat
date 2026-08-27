<script lang="ts">
  import { page } from "$app/state";
  import VoiceProvider from "$lib/components/voice/VoiceProvider.svelte";
  import GatewayProvider from "$lib/components/gateway/GatewayProvider.svelte";
  import { chatStore } from "$lib/stores/chat-store.svelte";
  import { onMount } from "svelte";
    import ChatStoreLifecycle from "$lib/components/lifecycles/ChatStoreLifecycle.svelte";
  import { ClientSettings, setClientSettings } from "$lib/settings/client-settings.svelte";

  let {
    children,
  }: { children: import("svelte").Snippet } = $props();

  const user = $derived(page.data.user ?? null);

  setClientSettings(new ClientSettings());
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
