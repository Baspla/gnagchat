<script lang="ts">
    import { onDestroy } from "svelte";
    import { VoiceRoomManager } from "$lib/voice/voice-room-manager.svelte";
    import { setVoiceRoom } from "$lib/voice/voice-context.svelte";
    import type { Snippet } from "svelte";

    let { children }: { children: Snippet } = $props();

    const manager = new VoiceRoomManager();
    setVoiceRoom(manager);

    onDestroy(() => {
        manager.destroy();
    });
</script>

{@render children()}