<script lang="ts">
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import type { DtoChannel } from "$shared/dto";
    import MessageList from "./MessageList.svelte";

    let {
        channel,
    }: {
        channel: DtoChannel;
    } = $props();

    let inputValue = $state("");

    let messages = $derived(
        chatStore
            .messages(channel.roomId)
            .sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf()),
    );

    $effect(() => {
        if (channel.roomId) {
            chatStore.focusedRoom(channel.roomId);
        }
    });

    function sendMessage() {
        if (!channel.roomId) return;
        chatStore.sendMessage(channel.roomId, inputValue).then((message) => {
            if (message) {
                inputValue = "";
            }
        });
    }
</script>

<div class=" max-h-full w-full flex flex-col">
    <div class="flex gap-2 shadow-2xl px-4 py-2 items-center shadow-surface-200-800">
        <div class="font-bold text-lg">
            {channel.name || "Unbenannter Channel"}
        </div>
    </div>
    <div class="flex flex-col gap-2 grow min-h-0">
        <MessageList messages={messages} roomId={channel.roomId}></MessageList>
    </div>
    <div class="flex gap-2 mt-2 mb-4 mx-4">
        <input
            type="text"
            placeholder="Shitposte..."
            class="w-full rounded p-2 input"
            bind:value={inputValue}
        />
        <button class="btn preset-filled p-2 rounded" onclick={sendMessage}>
            Senden
        </button>
    </div>
</div>
