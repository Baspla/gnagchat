<script lang="ts">
  import { onMount } from 'svelte';
  import { loadChannels, initSse } from '$lib/chat.svelte';
  import ChannelCreate from './ChannelCreate.svelte';
  import ChannelPicker from './ChannelPicker.svelte';
  import MessageWindow from './MessageWindow.svelte';
  import MessageSend from './MessageSend.svelte';

  let { userName, onLogout }: { userName: string; onLogout: () => void } = $props();

  onMount(() => {
    loadChannels();
    const unsubscribe = initSse();
    return () => {
      unsubscribe();
    };
  });
</script>

<div class="flex h-screen">
  <aside class="flex flex-col w-64 border-r p-4">
    <ChannelCreate />
    <ChannelPicker />
    <div class="mt-auto pt-4">
      <p class="mb-2">{userName}</p>
      <button onclick={onLogout} class="text-red-500">Logout</button>
    </div>
  </aside>

  <main class="flex flex-col flex-1 min-w-0">
    <MessageWindow />
    <MessageSend />
  </main>
</div>