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

    let messages = $derived(chatStore.messages(channel.roomId));

    $effect(() => {
        if (channel.roomId) {
            chatStore.focusRoom(channel.roomId);
        }
    });

    function sendMessage(content: string) {
        if (!channel.roomId) return;
        return chatStore.sendMessage(channel.roomId, content);
    }
</script>

<div class="flex h-full min-h-0 w-full flex-col">
    <div class="flex gap-2 shadow-2xl px-4 py-2 items-center shadow-surface-200-800">
        <div class="font-bold text-lg">
            {channel.name || "Unbenannter Channel"}
        </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-2">
        <MessageList messages={messages} roomId={channel.roomId}></MessageList>
    </div>
    <MessageInput onSend={sendMessage} />
</div>

