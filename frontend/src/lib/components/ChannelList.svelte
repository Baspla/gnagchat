<script lang="ts">
    import { api } from "$lib/api";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import type { DtoChannel } from "$shared/dto/chat";
    import { onMount } from "svelte";

    let {
        selectedChannel = $bindable(null as DtoChannel | null),
    }: {
        selectedChannel?: DtoChannel | null;
    } = $props();

    let channels: DtoChannel[] = $state([]);

    api.chat.channels.get().then((ch) => {
        if (ch.response.ok && ch.data) {
            channels = ch.data;
            if (channels.length > 0 && !selectedChannel) {
                selectedChannel = channels[0];
            }
        }
    });

    const manager = getVoiceRoom();

    onMount(() => {
        voiceStateStore.init();
    });
</script>

<div class="flex flex-col gap-2 p-2">
    <h2 class="text-lg font-bold">Channels</h2>
    {#each channels as channel (channel.roomId)}
        {@const voiceState = channel.voiceState ?? voiceStateStore.get(channel.roomId)}
        <div class="flex items-center gap-2">
            <button
                class="flex-1 p-2 rounded cursor-pointer text-left"
                onclick={() => (selectedChannel = channel)}
                class:bg-primary-500={selectedChannel?.roomId === channel.roomId}
            >
                <div class="flex items-center gap-2">
                    <span>{channel.name}</span>
                    {#if voiceState && voiceState.participantCount > 0}
                        <span class="inline-flex items-center gap-1 text-green-400 text-xs" title="Voice active">
                            🔊
                            <span class="text-gray-400">{voiceState.participantCount}</span>
                        </span>
                    {/if}
                </div>
                {#if voiceState && voiceState.participantCount > 0}
                    <div class="flex flex-wrap gap-1 mt-1">
                        {#each voiceState.participants as participant}
                            <span class="text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 flex items-center gap-1">
                                {#if participant.avatarUrl}
                                    <img src={participant.avatarUrl} alt="" class="w-3 h-3 rounded-full" />
                                {:else}
                                    <span class="w-3 h-3 rounded-full bg-gray-600 inline-block"></span>
                                {/if}
                                {participant.name}
                            </span>
                        {/each}
                    </div>
                {/if}
            </button>
            {#if manager.isConnected && manager.currentRoomName === channel.roomId}
                <span class="p-2 text-green-400" title="You are in this call">🔊</span>
            {:else}
                <button class="btn preset-filled p-2 rounded" onclick={() => manager.joinRoom(channel.roomId, channel.name)}>
                    📞
                </button>
            {/if}
        </div>
    {/each}
</div>
