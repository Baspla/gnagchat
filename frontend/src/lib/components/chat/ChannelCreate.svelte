<script lang="ts">
  import { chat, createChannel } from '$lib/chat.svelte';
  import { goto } from '$app/navigation';

  let name = $state('');

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ok = await createChannel(trimmed);
    if (ok) {
      name = '';
      // Navigate to the newly created channel (last one in the list, since it was just appended)
      const newest = chat.channels[chat.channels.length - 1];
      if (newest) {
        goto(`/chat/${newest.roomId}`);
      }
    }
  }
</script>

<div class="mb-4">
  <input
    type="text"
    bind:value={name}
    placeholder="New channel name"
    onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
    class="border rounded px-2 py-1 w-full mb-2"
  />
  <button onclick={handleSubmit} disabled={!name.trim()} class="border rounded px-3 py-1 w-full">
    Create Channel
  </button>
</div>
