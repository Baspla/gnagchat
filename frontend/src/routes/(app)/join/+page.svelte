<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
  import { onMount } from "svelte";
  import { createLogger } from "$lib/logger";
    import { api } from "$lib/api";

  const logger = createLogger("join");

  onMount(async () => {
    const roomId = page.url.searchParams.get("id");
    if (!roomId) {
      logger.warn("no roomid provided, redirecting to /");
      goto("/");
      return;
    }

    try {
      const manager = getVoiceRoom();
      const room = await api.chat.rooms({roomId:roomId}).get();
      let displayname = roomId;
      if (room?.data?.type == "channel"){
        displayname = room.data.name;
      }else if (room?.data?.type == "dm") {
        displayname = room.data.recipient.displayName || room.data.recipient.id;
      } else {
        logger.warn("invalid room type, redirecting to /");
        goto("/");
        return;
      }
      await manager.joinRoom(roomId, displayname);
    } catch (error) {
      logger.error("failed to join voice room", { roomId, error: String(error) });
    }

    goto("/");
  });
</script>