<script lang="ts">
    import { page } from "$app/state";
    import { setPageTitle } from "$lib/utils";
    import { onMount } from "svelte";
    import AppLayout from "$lib/components/layout/AppLayout.svelte";
    import ChannelList from "$lib/components/channellist/ChannelList.svelte";
    import ChannelView from "$lib/components/ChannelView.svelte";
    import { channelStore } from "$lib/stores/channel-store.svelte";

    let channelId = $derived(page.params.channelId ?? "");
    let channel = $derived(channelStore.get(channelId));
    // Only report "not found" once the initial channel list has been fetched,
    // otherwise a valid channel would briefly show as missing.
    let notFound = $derived(channelStore.isLoaded() && !channelStore.isInitialLoading() && !channel);

    onMount(() => {
        setPageTitle();
        channelStore.loadChannels();
    });
</script>

<AppLayout>
    {#snippet sidebar()}
        <ChannelList />
    {/snippet}
    {#if channel}
        <ChannelView {channel} />
    {:else if notFound}
        <div class="flex h-full w-full items-center justify-center text-surface-500-400">
            <p class="text-lg">Dieser Channel existiert nicht.</p>
        </div>
    {/if}
</AppLayout>