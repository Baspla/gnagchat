import { channelStore } from "$lib/stores/channel-store.svelte";
import { toaster } from "$lib/toaster";
import type { DtoChannel } from "$shared/dto/chat";

/**
 * Central place for all channel mutations.
 * Buttons call these functions directly; feedback is given via toasts.
 */
export const channelActions = {
    // ── Actions ─────────────────────────────────────────────────────

    // TODO: replace the static "default" name once the channel
    // creation dialog is reworked.
    async createChannel(): Promise<boolean> {
        const channel = await channelStore.createChannel("default");
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