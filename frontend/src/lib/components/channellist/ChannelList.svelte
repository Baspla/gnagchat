<script lang="ts">
    import { api } from "$lib/api";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import type { DtoChannel } from "$shared/dto/chat";
    import { onMount } from "svelte";
    import ChannelEntry from "$lib/components/channellist/ChannelEntry.svelte";
    import CallButton from "$lib/components/channellist/CallButton.svelte";

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
        <div class="flex items-center gap-2">
            <ChannelEntry
                {channel}
                selected={selectedChannel?.roomId === channel.roomId}
                onclick={() => (selectedChannel = channel)}
            />
            <CallButton {channel} {manager} />
        </div>
    {/each}
</div>
