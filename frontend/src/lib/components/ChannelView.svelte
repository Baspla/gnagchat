<script lang="ts">
    import { chatStore } from "$lib/stores/chat-store.svelte";
    import type { DtoChannel } from "$shared/dto";

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
    <div class="flex flex-col gap-2 grow overflow-y-auto overflow-x-hidden">
        <div class="flex flex-col gap-1 m-4">
            {#each messages as message (message.id)}
                <div class="flex flex-row gap-2 items-top">
                    <!-- avatar + name in one line -->
                    <div class="flex flex-col gap-1 items-start shrink-0">
                        <div class="flex flex-row items-center gap-1">
                            <img
                                src={message.author.avatarUrl}
                                alt="Avatar"
                                class="w-4 h-4 rounded-full"
                            />
                            <div class="font-bold">
                                {message.author.displayName || "Unbekannt"}
                            </div>
                            <div class="text-gray-500 text-sm">
                                {new Date(message.createdAt).toLocaleTimeString(
                                    [],
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    },
                                )}
                            </div>
                        </div>
                    </div>
                    <div
                        class="break-all wrap-break-word hyphens-auto flex-1 min-w-0 pr-3"
                    >
                        {message.content}
                    </div>
                </div>
            {/each}
        </div>
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
