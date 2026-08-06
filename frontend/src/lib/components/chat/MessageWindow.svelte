<script lang="ts">
  import { chat } from '$lib/chat.svelte';

  let containerEl: HTMLDivElement = $state()!;

  // Auto-scroll to bottom when messages change
  $effect(() => {
    if (chat.activeChannelId && chat.messages[chat.activeChannelId]) {
      // Access messages to trigger reactivity
      const _ = chat.messages[chat.activeChannelId].length;
      if (containerEl) {
        containerEl.scrollTop = containerEl.scrollHeight;
      }
    }
  });

  const currentMessages = $derived(chat.activeChannelId ? chat.messages[chat.activeChannelId] ?? [] : []);
</script>

<div>
  <h3>Messages</h3>
  {#if chat.activeChannelId}
    <div bind:this={containerEl} style="overflow-y: auto; max-height: 400px;">
      {#each currentMessages as msg}
        <div>
          <strong>{msg.userId}</strong>: {msg.content}
          <em>{new Date(msg.createdAt).toLocaleTimeString()}</em>
        </div>
      {/each}
    </div>
  {:else}
    <p>Select a channel to view messages.</p>
  {/if}
</div>