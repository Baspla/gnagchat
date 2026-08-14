<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";
  import AppLayout from "$lib/components/layout/AppLayout.svelte";
  import ChannelList from "$lib/components/ChannelList.svelte";
  import ChatView from "$lib/components/ChatView.svelte";
  import type { DtoChannel } from "$shared/dto/chat";

  let selectedChannel: DtoChannel | null = $state(null);

  onMount(() => {
    setPageTitle();
  });
</script>

<AppLayout>
  {#snippet sidebar()}
    <ChannelList bind:selectedChannel />
  {/snippet}
  {#if selectedChannel}
    <ChatView roomId={selectedChannel.roomId} />
  {/if}
</AppLayout>
