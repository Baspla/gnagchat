<script lang="ts">
    let {
        onSend,
    }: {
        onSend: (content: string) => Promise<unknown> | void;
    } = $props();

    let inputValue = $state("");

    function sendMessage() {
        const result = onSend(inputValue);
        if (result instanceof Promise) {
            result.then((message) => {
                if (message) {
                    inputValue = "";
                }
            });
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key !== "Enter" || event.shiftKey) return;

        event.preventDefault();
        sendMessage();
    }
</script>

<div class="flex gap-2 mt-2 mb-4 mx-4">
    <textarea
        placeholder="Shitposte..."
        class="w-full rounded p-2 input resize-none"
        rows="1"
        bind:value={inputValue}
        onkeydown={handleKeydown}
    ></textarea>
    <button class="btn preset-filled p-2 rounded" onclick={sendMessage}>
        Senden
    </button>
</div>