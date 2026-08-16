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

    const manager = getVoiceRoom();

    onMount(() => {
        api.chat.channels.get().then((ch) => {
            if (ch.response.ok && ch.data) {
                channels = ch.data;
                // Seed voice state store with initial data so it's available immediately
                for (const channel of ch.data) {
                    if (channel.voiceState) {
                        voiceStateStore.seed(channel.voiceState);
                    }
                }
                if (channels.length > 0 && !selectedChannel) {
                    selectedChannel = channels[0];
                }
            }
        });
        voiceStateStore.init();
    });
</script>

<div class="flex flex-col gap-2 p-2">
    <h2 class="text-lg font-bold px-2">Gnag Chat</h2>
    {#each channels as channel (channel.roomId)}
        {@const voiceState = voiceStateStore.get(channel.roomId)}
        <div class="flex items-center gap-2">
            <button
                class="flex-1 p-2 rounded cursor-pointer text-left"
                onclick={() => (selectedChannel = channel)}
                class:bg-primary-500={selectedChannel?.roomId ===
                    channel.roomId}
            >
                <div class="flex items-center gap-2">
                    <span>{channel.name}</span>
                    {#if voiceState && voiceState.userCount > 0}
                        <span
                            class="inline-flex items-center gap-1 text-green-400 text-xs"
                            title="Voice active"
                        >
                            🔊
                            <span class="text-gray-400"
                                >{voiceState.userCount}</span
                            >
                        </span>
                    {/if}
                </div>
                {#if voiceState && voiceState.userCount > 0}
                    <div class="flex flex-wrap gap-1 mt-1">
                        {#each voiceState.users as user}
                            <span
                                class="text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 flex items-center gap-1"
                            >
                                {#if user.avatarUrl}
                                    <img
                                        src={user.avatarUrl}
                                        alt=""
                                        class="w-3 h-3 rounded-full"
                                    />
                                {:else}
                                    <span
                                        class="w-3 h-3 rounded-full bg-gray-600 inline-block"
                                    ></span>
                                {/if}
                                {user.name}
                                {#if user.devices.length > 1}
                                    <span class="text-[10px] text-gray-400"
                                        >+{user.devices.length - 1}</span
                                    >
                                {/if}
                            </span>
                        {/each}
                    </div>
                {/if}
            </button>
            {#if manager.isConnected && manager.currentRoomName === channel.roomId}
                <span class="p-2 text-green-400" title="You are in this call"
                    >🔊</span
                >
            {:else}
                <button
                    class="btn preset-filled p-2 rounded"
                    onclick={() =>
                        manager.joinRoom(channel.roomId, channel.name)}
                >
                    📞
                </button>
            {/if}
        </div>
    {/each}
</div>
