<script lang="ts">
    import { goto } from "$app/navigation";
    import { setPageTitle } from "$lib/utils";
    import { onMount } from "svelte";
    import AppLayout from "$lib/components/layout/AppLayout.svelte";
    import ChannelList from "$lib/components/channellist/ChannelList.svelte";
    import { channelStore } from "$lib/stores/channel-store.svelte";

    // Preserve the old behavior of auto-selecting the first channel:
    // once the channel list is loaded, redirect to it.
    let noChannels = $state(false);

    onMount(() => {
        setPageTitle();
        channelStore.loadChannels().then(() => {
            const first = channelStore.channels()[0];
            if (first) {
                goto(`/channel/${first.roomId}`);
            } else {
                noChannels = true;
            }
        });
    });
</script>

<AppLayout>
    {#snippet sidebar()}
        <ChannelList />
    {/snippet}
    {#if noChannels}
        <div class="flex h-full w-full items-center justify-center text-surface-500-400">
            <p class="text-lg">Keine Channels vorhanden.</p>
        </div>
    {/if}
</AppLayout>