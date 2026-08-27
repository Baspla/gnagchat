<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";
  import CallDebugger from "$lib/components/voice/CallDebugger.svelte";
  import AppLayout from "$lib/components/layout/AppLayout.svelte";
    import ChannelList from "$lib/components/channellist/ChannelList.svelte";

  onMount(() => {
    setPageTitle();
  });
</script>

<AppLayout>
  {#snippet sidebar()}
    <ChannelList />
  {/snippet}
  <CallDebugger />
</AppLayout>
