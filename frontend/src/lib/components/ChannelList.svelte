<script lang="ts">
    import { api } from "$lib/api";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import type { DtoChannel } from "$shared/dto/chat";
    import { onMount } from "svelte";
    import Volume2 from "@lucide/svelte/icons/volume-2";
    import PhoneCall from "@lucide/svelte/icons/phone-call";
    import PhoneOff from "@lucide/svelte/icons/phone-off";

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
                class:bg-surface-300-700={selectedChannel?.roomId ===
                    channel.roomId}
            >
                <div class="flex items-center gap-2">
                    <span>{channel.name}</span>
                    {#if voiceState && voiceState.userCount > 0}
                        <span
                            class="inline-flex items-center gap-1 text-green-400 text-xs"
                            title="Voice active"
                        >
                            <Volume2 class="w-3 h-3" />
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
                <button class="btn preset-filled-error-500 p-2 rounded" title="Disconnect from call" onclick={() => manager.leaveRoom()}>
                    <PhoneOff class="w-4 h-4" />
                </button>
            {:else}
                <button
                    class="btn preset-filled p-2 rounded"
                    onclick={() =>
                        manager.joinRoom(channel.roomId, channel.name)}
                >
                    <PhoneCall class="w-4 h-4" />
                </button>
            {/if}
        </div>
    {/each}
</div>