<script lang="ts">
    import Volume2 from "@lucide/svelte/icons/volume-2";
    import type { DtoChannel } from "$shared/dto/chat";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import VoiceUserList from "$lib/components/channellist/VoiceUserList.svelte";

    let {
        channel,
        selected = false,
        onclick,
    }: {
        channel: DtoChannel;
        selected?: boolean;
        onclick: () => void;
    } = $props();

    let voiceState = $derived(voiceStateStore.get(channel.roomId));
</script>

<button
    class="flex-1 p-2 rounded cursor-pointer text-left"
    {onclick}
    class:bg-surface-300-700={selected}
>
    <div class="flex items-center gap-2">
        <span>{channel.name}</span>
        {#if voiceState && voiceState.userCount > 0}
            <span
                class="inline-flex items-center gap-1 text-green-400 text-xs"
                title="Voice active"
            >
                <Volume2 class="w-3 h-3" />
                <span class="text-gray-400">{voiceState.userCount}</span>
            </span>
        {/if}
    </div>
    {#if voiceState && voiceState.userCount > 0}
        <VoiceUserList users={voiceState.users} />
    {/if}
</button>
