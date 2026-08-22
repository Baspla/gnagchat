<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import { channelStore } from "$lib/stores/channel-store.svelte";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import { onMount } from "svelte";
    import ChannelEntry from "$lib/components/channellist/ChannelEntry.svelte";
    import CallButton from "$lib/components/channellist/CallButton.svelte";
    import { channelActions, channelDialogState } from "$lib/components/channellist/channel-actions.svelte";
    import CustomContextMenu from "../customcontext/CustomContextMenu.svelte";
    import CustomContextMenuItem from "../customcontext/CustomContextMenuItem.svelte";
    import AlertDialog from "../customdialog/AlertDialog.svelte";

    let channels = $derived(channelStore.channels());

    // The selected channel is derived from the current route
    // (/channel/[channelId]) instead of local state.
    let selectedRoomId = $derived(page.params.channelId ?? null);

    const manager = getVoiceRoom();

    let createChannelName = $state("");
    let editChannelName = $state("");

    // Prefill the edit input whenever the edit dialog opens
    $effect(() => {
        if (channelDialogState.editOpen) {
            editChannelName = channelDialogState.editingChannel?.name ?? "";
        }
    });

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

    async function createChannelAction() {
            if (await channelActions.createChannel(createChannelName)) {
                channelDialogState.createOpen = false;
            }
    }

    async function updateChannelAction() {
        const editing = channelDialogState.editingChannel;
        if (!editing) return;
        if (await channelActions.updateChannel(editing, editChannelName)) {
            channelDialogState.editOpen = false;
            channelDialogState.editingChannel = null;
        }
    }

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
    <AlertDialog bind:open={channelDialogState.createOpen} contentProps={{ class: "p-4", interactOutsideBehavior: "close" }} actionLabel="Channel erstellen" onAction={() => createChannelAction()}>
        {#snippet title()}
            <p>Channel erstellen</p>
        {/snippet}
        {#snippet description()}
            <p>Erschaffe einen neuen Realm des Shitposting</p>
        {/snippet}
        <input
            placeholder="Channel Name"
            class="w-full rounded p-2 input"
            type="text"
            bind:value={createChannelName}
        />
    </AlertDialog>
    <AlertDialog bind:open={channelDialogState.editOpen} contentProps={{ class: "p-4", interactOutsideBehavior: "close" }} actionLabel="Speichern" onAction={() => updateChannelAction()}>
        {#snippet title()}
            <p>Channel bearbeiten</p>
        {/snippet}
        {#snippet description()}
            <p>Benenne den Channel um</p>
        {/snippet}
        <input
            placeholder="Channel Name"
            class="w-full rounded p-2 input"
            type="text"
            bind:value={editChannelName}
        />
    </AlertDialog>
    {#snippet contextMenuContent()}
        <CustomContextMenuItem>
            <button onclick={() => channelDialogState.createOpen = true}>Channel erstellen</button>
        </CustomContextMenuItem>
    {/snippet}
</CustomContextMenu>
