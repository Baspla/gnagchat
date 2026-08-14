<script lang="ts">
    import { api } from "$lib/api";
    import type { DtoChannel } from "$shared/dto/chat";

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
</script>

<div class="flex flex-col gap-2 p-2">
    <h2 class="text-lg font-bold">Channels</h2>
    {#each channels as channel (channel.roomId)}
        <button
            class="p-2 rounded cursor-pointer text-left"
            onclick={() => (selectedChannel = channel)}
            class:bg-blue-500={selectedChannel?.roomId === channel.roomId}
        >
            {channel.name}
        </button>
    {/each}
</div>
