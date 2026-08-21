<script lang="ts">
    import Volume2 from "@lucide/svelte/icons/volume-2";
    import type { DtoChannel } from "$shared/dto/chat";
    import { voiceStateStore } from "$lib/voice/voice-state-store.svelte";
    import VoiceUserList from "$lib/components/channellist/VoiceUserList.svelte";
    import CustomContextMenu from "../CustomContextMenu.svelte";
    import CustomContextMenuItem from "../CustomContextMenuItem.svelte";
    import { api } from "$lib/api";
    import { toaster } from "$lib/toaster";

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

    function createChannel(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    ) {
        // TODO open a CreateChannelDialog component instead of creating a channel with a default name
        api.chat.channels.post({ name: "Neuer Channel" }).then((res) => {
            if (!res.response.ok || !res.data) {
                console.error("Failed to create channel", res);
                // the error response is {"error":{"code":"BAD_REQUEST","message":"Channel name can only contain letters, numbers, hyphens, and underscores"}}
                // toaster out the error message from the json response.
                // TODO Figure out how errors work with Elysia
                let error = res.error;
                console.error("Failed to create channel", error);

            } else {
                toaster.success({
                    title: "Channel erstellt",
                    description: `Der Channel "${res.data.name}" wurde erfolgreich erstellt.`,
                });
            }
        });
    }

    function editChannel(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    ) {
        // TODO open the settings dialog for the channel instead of throwing an error
        throw new Error("Function not implemented.");
    }

    function deleteChannel(
        event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    ) {
        api.chat
            .channels({ roomId: channel.roomId })
            .delete()
            .then((res) => {
                if (!res.response.ok) {
                    console.error("Failed to delete channel", res);
                    toaster.error({
                        title: "Fehler beim Löschen des Channels",
                        description:
                            res.response.statusText || "Unbekannter Fehler",
                    });
                } else {
                    toaster.success({
                        title: "Channel gelöscht",
                        description: `Der Channel "${channel.name}" wurde erfolgreich gelöscht.`,
                    });
                }
            });
    }
</script>

<CustomContextMenu triggerClass="w-full">
    <button
        class="flex-1 p-2 rounded cursor-pointer text-left w-full"
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
    {#snippet contextMenuContent()}
        <CustomContextMenuItem>
            <button onclick={createChannel}> Channel erstellen </button>
        </CustomContextMenuItem>
        <CustomContextMenuItem disabled>
            <button onclick={editChannel}> Channel bearbeiten </button>
        </CustomContextMenuItem>
        <CustomContextMenuItem>
            <button onclick={deleteChannel}> Channel löschen </button>
        </CustomContextMenuItem>
    {/snippet}
</CustomContextMenu>
