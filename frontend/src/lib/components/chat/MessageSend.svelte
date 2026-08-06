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

<div>
  <input
    type="text"
    bind:value={content}
    placeholder="Type a message..."
    disabled={!chat.activeChannelId}
    onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
  />
  <button
    onclick={handleSubmit}
    disabled={!chat.activeChannelId || !content.trim()}
  >
    Send
  </button>
</div>