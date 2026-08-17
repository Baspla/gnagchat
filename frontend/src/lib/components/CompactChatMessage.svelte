<script lang="ts">
    import type { DtoChatMessage } from "$shared/dto";
    let {
        message,
    }: {
        message: DtoChatMessage;
    } = $props();
</script>

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
            {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            })}
        </div>
    </div>
</div>
<div class="break-all wrap-break-word hyphens-auto flex-1 min-w-0 pr-3">
    {message.content}
</div>
