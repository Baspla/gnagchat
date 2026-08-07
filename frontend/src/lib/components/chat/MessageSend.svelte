<script lang="ts">
  import { chat, sendMessage } from '$lib/chat.svelte';

  let content = $state('');

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || !chat.activeChannelId) return;
    await sendMessage(trimmed);
    content = '';
  }
</script>

<div class="p-4 flex">
  <input
    type="text"
    bind:value={content}
    placeholder="Type a message..."
    disabled={!chat.activeChannelId}
    onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
    class="border rounded px-2 py-1 mr-2 w-full"
  />
  <button
    onclick={handleSubmit}
    disabled={!chat.activeChannelId || !content.trim()}
    class="border rounded px-3 py-1"
  >
    Senden
  </button>
</div>
