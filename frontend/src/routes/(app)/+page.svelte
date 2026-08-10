<script lang="ts">
  import { setPageTitle } from "$lib/utils";
  import { onMount } from "svelte";
  import VoiceChat from "$lib/components/voicechat.svelte";

  onMount(() => {
    setPageTitle();
  });
</script>

<div class="flex h-full">
  <VoiceChat/>
</div>