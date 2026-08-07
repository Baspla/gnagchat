<script lang="ts">
  import { browser } from "$app/environment";
  import { chat, selectChannel } from "$lib/chat.svelte";
  import { setPageTitle } from "$lib/utils";
  import MessageWindow from "$lib/components/chat/MessageWindow.svelte";
  import MessageSend from "$lib/components/chat/MessageSend.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let { roomId } = $derived(data);

  // Track the last room we actually loaded to avoid re-fetching on every re-render
  let lastLoadedRoomId = $state<string | null>(null);

  // React to roomId changes (initial load and client-side navigation between channels)
  $effect(() => {
    if (!browser) return;
    if (roomId && roomId !== lastLoadedRoomId) {
      lastLoadedRoomId = roomId;
      selectChannel(roomId);
    }
  });

  $effect(() => {
    const channel = chat.channels.find(c => c.roomId === roomId);
    if (channel) {
      setPageTitle(channel.name);
    }
  });
</script>

<MessageWindow />
<MessageSend />