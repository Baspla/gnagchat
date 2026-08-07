<script lang="ts">
  import { chat, selectChannel,deleteChannel } from '$lib/chat.svelte';

  
  async function handleDeleteChannel() {
    if (!chat.activeChannelId) return;
    if (confirm('U sure?')) {
      await deleteChannel(chat.activeChannelId);
    }
  }
</script>

<div>

    <button class="text-red-500" onclick={handleDeleteChannel}>Channel löschen</button>
  <h3 class="text-lg font-semibold">Channels</h3>
  <ul>
    {#each chat.channels as channel}
      <li>
        <button
          onclick={() => selectChannel(channel.roomId)}
          style={chat.activeChannelId === channel.roomId
            ? 'font-weight: bold; background-color: #e0e0e0;'
            : ''}
        >
          {channel.name}
        </button>
      </li>
    {/each}
  </ul>
</div>