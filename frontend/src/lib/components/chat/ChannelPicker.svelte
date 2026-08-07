<script lang="ts">
  import { chat, selectChannel, deleteChannel } from '$lib/chat.svelte';

  async function handleDeleteChannel() {
    if (!chat.activeChannelId) return;
    if (confirm('U sure?')) {
      await deleteChannel(chat.activeChannelId);
    }
  }
</script>

<div class="flex flex-col flex-1 min-h-0">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-lg font-semibold">Channels</h3>
    <button class="text-red-500 text-sm" onclick={handleDeleteChannel}>Channel löschen</button>
  </div>
  <ul class="flex-1 overflow-y-auto min-h-0">
    {#each chat.channels as channel}
      <li class="mb-1">
        <button
          onclick={() => selectChannel(channel.roomId)}
          class="w-full text-left px-2 py-1 rounded"
          style={chat.activeChannelId === channel.roomId ? 'font-weight: bold; background-color: #e0e0e0;' : ''}
        >
          {channel.name}
        </button>
      </li>
    {/each}
  </ul>
</div>