<script lang="ts">
    import PhoneCall from "@lucide/svelte/icons/phone-call";
    import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
    import type { DtoChannel } from "$shared/dto/chat";
    import type { VoiceRoomManager } from "$lib/voice/voice-room-manager.svelte";
    import { goto } from "$app/navigation";

    let {
        channel,
        manager,
    }: {
        channel: DtoChannel;
        manager: VoiceRoomManager;
    } = $props();

    let isCurrentCall = $derived(
        manager.isConnected && manager.currentRoomId === channel.roomId,
    );
</script>

{#if isCurrentCall}
    <!-- Open the call view -->
    <button
        class="btn preset-filled p-2 rounded"
        title={`Open call view for ${channel.name}`}
        aria-label={`Open call view for ${channel.name}`}
        onclick={() => goto('/call')}
    >
        <ArrowUpRight class="w-4 h-4"/>
    </button>
{:else}
    <!--<button
        class="btn preset-filled p-2 rounded"
        title={`Join ${channel.name}`}
        aria-label={`Join ${channel.name}`}
        onclick={() => manager.joinRoom(channel.roomId, channel.name)}
    >
        <PhoneCall class="w-4 h-4" />
    </button>-->
{/if}
