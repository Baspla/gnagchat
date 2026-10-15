<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";
  import CallView from "$lib/components/voice/CallView.svelte";
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
  <CallView />
</AppLayout>
