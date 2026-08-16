<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
  import { onMount } from "svelte";
  import { createLogger } from "$lib/logger";

  const logger = createLogger("joincall");

  onMount(async () => {
    const roomId = page.url.searchParams.get("roomid");
    if (!roomId) {
      logger.warn("no roomid provided, redirecting to /");
      goto("/");
      return;
    }

    try {
      const manager = getVoiceRoom();
      await manager.joinRoom(roomId);
    } catch (error) {
      logger.error("failed to join voice room", { roomId, error: String(error) });
    }

    goto("/");
  });
</script>