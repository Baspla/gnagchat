<script lang="ts">
  import { onMount } from 'svelte';
  import { loadChannels, initSse } from '$lib/chat.svelte';
  import ChannelPicker from './ChannelPicker.svelte';
  import ChannelCreate from './ChannelCreate.svelte';
  import MessageWindow from './MessageWindow.svelte';
  import MessageSend from './MessageSend.svelte';

  onMount(() => {
    loadChannels();
    const unsubscribe = initSse();
    return () => {
      unsubscribe();
    };
  });
</script>

<div>
  <div>
    <ChannelCreate />
    <ChannelPicker />
  </div>
  <div>
    <MessageWindow />
    <MessageSend />
  </div>
</div>