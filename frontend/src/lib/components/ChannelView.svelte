<script lang="ts">
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import type { DtoChannel } from "$shared/dto";
    import MessageList from "./MessageList.svelte";
    import MessageInput from "./MessageInput.svelte";

    let {
        channel,
    }: {
        channel: DtoChannel;
    } = $props();

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

    function sendMessage(content: string) {
        if (!channel.roomId) return;
        return chatStore.sendMessage(channel.roomId, content);
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
    <MessageInput onSend={sendMessage} />
</div>

