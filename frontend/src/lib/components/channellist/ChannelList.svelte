<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import { channelStore } from "$lib/stores/channel-store.svelte";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import { onMount } from "svelte";
    import ChannelEntry from "$lib/components/channellist/ChannelEntry.svelte";
    import CallButton from "$lib/components/channellist/CallButton.svelte";
    import { channelActions } from "$lib/components/channellist/channel-actions.svelte";
    import CustomContextMenu from "../customcontext/CustomContextMenu.svelte";
    import CustomContextMenuItem from "../customcontext/CustomContextMenuItem.svelte";

    let channels = $derived(channelStore.channels());

    // The selected channel is derived from the current route
    // (/channel/[channelId]) instead of local state.
    let selectedRoomId = $derived(page.params.channelId ?? null);

    const manager = getVoiceRoom();

    onMount(() => {
        channelStore.loadChannels().then(() => {
            // Seed voice state store with initial data so it's available immediately
            for (const channel of channelStore.channels()) {
                if (channel.voiceState) {
                    voiceStateStore.seed(channel.voiceState);
                }
            }
        });
        voiceStateStore.init();
    });
</script>

<CustomContextMenu triggerClass="h-full">
    <div class="flex flex-col gap-2 p-2 h-full overflow-y-auto">
        <h2 class="text-lg font-bold px-2">Gnag Chat</h2>
        {#each channels as channel (channel.roomId)}
            <div class="flex items-center gap-2">
                <ChannelEntry
                    {channel}
                    selected={selectedRoomId === channel.roomId}
                    onclick={() => goto(`/channel/${channel.roomId}`)}
                />
                <CallButton {channel} {manager} />
            </div>
        {/each}
    </div>
    {#snippet contextMenuContent()}
        <CustomContextMenuItem>
            <button onclick={() => channelActions.createChannel()}>Channel erstellen</button>
        </CustomContextMenuItem>
    {/snippet}
</CustomContextMenu>
