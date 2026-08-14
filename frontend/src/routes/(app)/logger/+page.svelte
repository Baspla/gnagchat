<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";
  import CentrifugoLogger from "$lib/components/TestCentrifugoLogger.svelte";
  import AppLayout from "$lib/components/layout/AppLayout.svelte";

  onMount(() => {
    setPageTitle();
  });
</script>

<AppLayout>
  <CentrifugoLogger />
</AppLayout>
