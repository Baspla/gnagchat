<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";
  import CallDebugger from "$lib/components/voice/CallDebugger.svelte";
  import AppLayout from "$lib/components/layout/AppLayout.svelte";

  onMount(() => {
    setPageTitle();
  });
</script>

<AppLayout>
  <CallDebugger />
</AppLayout>
