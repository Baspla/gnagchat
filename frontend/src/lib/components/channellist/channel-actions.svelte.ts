import { channelStore } from "$lib/stores/channel-store.svelte";
import { toaster } from "$lib/toaster";
import type { DtoChannel } from "$shared/dto/chat";

/**
 * Reactive UI state for the channel dialogs (create / edit).
 * Shared between components so any context menu can open them,
 * while the dialogs themselves are rendered once in `ChannelList`.
 */
export const channelDialogState = $state({
    createOpen: false,
    editOpen: false,
    editingChannel: null as DtoChannel | null,
});

/**
 * Central place for all channel mutations.
 * Buttons call these functions directly; feedback is given via toasts.
 */
export const channelActions = {
    // ── Actions ─────────────────────────────────────────────────────

    async createChannel(channelName: string): Promise<boolean> {
        const channel = await channelStore.createChannel(channelName);
        if (!channel) {
            toaster.error({
                title: "Fehler beim Erstellen des Channels",
                description: "Unbekannter Fehler",
            });
            return false;
        }
        toaster.success({
            title: "Channel erstellt",
            description: `Der Channel "${channel.name}" wurde erfolgreich erstellt.`,
        });
        return true;
    },

    async updateChannel(channel: DtoChannel, newName: string): Promise<boolean> {
        // TODO: implement rename endpoint in backend + channelStore.updateChannel
        toaster.info({
            title: "Noch nicht implementiert",
            description: "Das Umbenennen von Channels ist noch nicht verfügbar.",
        });
        return false;
    },

    async deleteChannel(channel: DtoChannel): Promise<boolean> {
        const success = await channelStore.deleteChannel(channel.roomId);
        if (!success) {
            toaster.error({
                title: "Fehler beim Löschen des Channels",
                description: "Unbekannter Fehler",
            });
            return false;
        }
        toaster.success({
            title: "Channel gelöscht",
            description: `Der Channel "${channel.name}" wurde erfolgreich gelöscht.`,
        });
        return true;
    },
};