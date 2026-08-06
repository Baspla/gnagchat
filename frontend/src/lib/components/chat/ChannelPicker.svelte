<script lang="ts">
  import { chat, selectChannel } from '$lib/chat.svelte';
</script>

<div>
  <h3>Channels</h3>
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