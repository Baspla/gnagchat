<script lang="ts">
    import type { DtoChatMessage } from "$shared/dto";
    import { ContextMenu } from "bits-ui";
    import FormattedTime from "./FormattedTime.svelte";
    import CustomContextMenu from "./CustomContextMenu.svelte";
    import CustomContextMenuItem from "./CustomContextMenuItem.svelte";
    let {
        message,
    }: {
        message: DtoChatMessage;
    } = $props();

    function limit(content: string, maxLen: number) {
        if (content.length > maxLen) {
            return content.substring(0, maxLen) + "...";
        }
        return content;
    }

    let expanded = $state(false);
    let expandable = $derived(() => message.content.length > 200);
</script>

<CustomContextMenu>
    <div class="flex flex-row gap-2 items-start py-1">
        <img
            src={message.author.avatarUrl}
            alt="Avatar"
            class="w-12 h-12 rounded-full"
        />

        <div class="flex flex-col gap-1 flex-1 min-w-0 max-w-full">
            <div class="flex flex-row gap-2 items-baseline">
                <div class="font-bold">
                    {message.author.displayName || "Unbekannt"}
                </div>
                <div class="text-gray-500 text-sm">
                    <FormattedTime timestamp={message.createdAt} />
                </div>
            </div>

            <div class="break-all wrap-break-word hyphens-auto pr-3">
                {#if expanded}
                    {message.content}
                {:else}
                    {limit(message.content, 200)}
                {/if}
                {#if expandable()}
                    <button
                        class="text-primary-500 text-sm"
                        onclick={() => (expanded = !expanded)}
                    >
                        {expanded
                            ? "Weniger anzeigen"
                            : "Mehr anzeigen (" +
                              (message.content.length - 200) +
                              " Zeichen)"}
                    </button>trigger
                {/if}
            </div>
        </div>
    </div>
    {#snippet contextMenuContent()}
        <CustomContextMenuItem disabled>
            <div>Nachricht löschen</div>
        </CustomContextMenuItem>
        <CustomContextMenuItem disabled>
            <div>Nachricht kopieren</div>
        </CustomContextMenuItem>
        <CustomContextMenuItem disabled>
            <div>Nachricht bearbeiten</div>
        </CustomContextMenuItem>
        <CustomContextMenuItem disabled>
            <div>Reaktions Menü</div>
        </CustomContextMenuItem>
    {/snippet}
</CustomContextMenu>
