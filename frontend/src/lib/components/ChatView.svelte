<script lang="ts">
    import { chatStore } from "$lib/stores/chat-store.svelte";

    let {
        roomId,
    }: {
        roomId: string;
    } = $props();

    let inputValue = $state("");

    let messages = $derived(
        chatStore
            .messages(roomId)
            .sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf()),
    );

    $effect(() => {
        if (roomId) {
            chatStore.focusedRoom(roomId);
        }
    });

    function sendMessage() {
        if (!roomId) return;
        chatStore.sendMessage(roomId, inputValue).then((message) => {
            if (message) {
                inputValue = "";
            }
        });
    }
</script>

<div class="m-4 max-h-full w-full flex flex-col">
    <div class="flex flex-col gap-2 grow overflow-y-auto overflow-x-hidden">
        <div class="flex flex-col gap-1">
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
                    <div class="break-all wrap-break-word hyphens-auto flex-1 min-w-0 pr-3"
                    >{message.content}</div>
                </div>
            {/each}
        </div>
    </div>
    <div class="flex gap-2 mt-2">
        <input
            type="text"
            placeholder="Shitposte..."
            class="w-full rounded p-2 input"
            bind:value={inputValue}
        />
        <button
            class="btn preset-filled p-2 rounded"
            onclick={sendMessage}
        >
            Senden
        </button>
    </div>
</div>
