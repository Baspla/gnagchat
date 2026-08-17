<script lang="ts">
    import PhoneCall from "@lucide/svelte/icons/phone-call";
    import PhoneOff from "@lucide/svelte/icons/phone-off";
    import type { DtoChannel } from "$shared/dto/chat";
    import type { VoiceRoomManager } from "$lib/voice/voice-room-manager.svelte";

    let { channel, manager }: {
        channel: DtoChannel;
        manager: VoiceRoomManager;
    } = $props();

    let isCurrentCall = $derived(
        manager.isConnected && manager.currentRoomId === channel.roomId,
    );
</script>

{#if isCurrentCall}
    <button
        class="btn preset-filled-error-500 p-2 rounded"
        title="Disconnect from call"
        aria-label={`Disconnect from ${channel.name}`}
        onclick={() => manager.leaveRoom()}
    >
        <PhoneOff class="w-4 h-4" />
    </button>
{:else}
    <button
        class="btn preset-filled p-2 rounded"
        title={`Join ${channel.name}`}
        aria-label={`Join ${channel.name}`}
        onclick={() => manager.joinRoom(channel.roomId, channel.name)}
    >
        <PhoneCall class="w-4 h-4" />
    </button>
{/if}