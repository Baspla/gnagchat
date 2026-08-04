<script lang="ts">
    import { api } from '$lib/api';
    import { Dialog, Button, Input } from './styled/index.ts';

    let { show = false, onClose }: { show?: boolean; onClose: () => void } = $props();

    let channelName = $state('');
    let error = $state<string | null>(null);
    let creating = $state(false);

    function reset() {
        channelName = '';
        error = null;
        creating = false;
    }

    async function handleCreate() {
        error = null;

        const trimmed = channelName.trim();
        if (!trimmed) {
            error = 'Channel name is required';
            return;
        }

        creating = true;
        try {
            const response = await api.chat.channels.post({
                name: trimmed
            });

            if (response.error) {
                error = 'Failed to create channel';
                return;
            }

            // Success — close the modal, parent will refresh
            reset();
            onClose();
        } catch (e: any) {
            error = e.message || 'Failed to create channel';
        } finally {
            creating = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            reset();
            onClose();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCreate();
        }
    }

    function handleOpenChange(open: boolean) {
        if (!open) {
            reset();
            onClose();
        }
    }
</script>

<Dialog
    bind:open={show}
    onOpenChange={handleOpenChange}
    title="Create Channel"
    description="Create a new text channel"
>
    {#snippet children()}
        <Input
            label="Channel Name"
            bind:value={channelName}
            onkeydown={handleKeydown}
            placeholder="new-channel"
            leadingIcon="#"
            disabled={creating}
        />
        {#if error}
            <p class="mt-2 text-sm text-discord-red">{error}</p>
        {/if}
        <p class="mt-2 text-xs text-discord-text-dim">
            Channel names must be lowercase, without spaces, and can contain hyphens and underscores.
        </p>
    {/snippet}

    {#snippet footer()}
        <Button
            variant="ghost"
            onclick={() => { reset(); onClose(); }}
            disabled={creating}
        >
            Cancel
        </Button>
        <Button
            variant="primary"
            onclick={handleCreate}
            disabled={creating || !channelName.trim()}
        >
            {#if creating}
                <span class="flex items-center gap-2">
                    <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                </span>
            {:else}
                Create Channel
            {/if}
        </Button>
    {/snippet}
</Dialog>