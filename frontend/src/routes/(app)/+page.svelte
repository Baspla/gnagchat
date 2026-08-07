<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";

  onMount(() => {
    setPageTitle();
  });
</script>

<div class="flex items-center justify-center h-full text-gray-500">
  <p>Wähle einen Channel aus.</p>
</div>