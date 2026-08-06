<script lang="ts">
  import { createChannel } from '$lib/chat.svelte';

  let name = $state('');

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ok = await createChannel(trimmed);
    if (ok) {
      name = '';
    }
  }
</script>

<div>
  <input
    type="text"
    bind:value={name}
    placeholder="New channel name"
    onkeydown={(e) => e.key === 'Enter' && handleSubmit()}
  />
  <button onclick={handleSubmit} disabled={!name.trim()}>
    Create Channel
  </button>
</div>