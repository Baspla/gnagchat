import { getContext, setContext } from "svelte";
import { createLogger } from "$lib/logger";

const logger = createLogger("client-settings");

const STORAGE_KEY = "gnagchat-client-settings";

/**
 * Client-side settings that are persisted in localStorage.
 * These are per-device settings (not synced to the server).
 */
export class ClientSettings {
    notificationsEnabled = $state(false);
    inputDeviceId = $state<string | null>(null);
    videoDeviceId = $state<string | null>(null);
    outputDeviceId = $state<string | null>(null);
    outputVolume = $state(100);

    constructor() {
        this.load();
        $effect.root(() => {
            $effect(() => {
                this.persist();
            });
        });
    }

    private load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw) as Partial<ClientSettingsData>;
            if (typeof data.notificationsEnabled === "boolean") {
                this.notificationsEnabled = data.notificationsEnabled;
            }
            if (typeof data.inputDeviceId === "string" || data.inputDeviceId === null) {
                this.inputDeviceId = data.inputDeviceId;
            }
            if (typeof data.videoDeviceId === "string" || data.videoDeviceId === null) {
                this.videoDeviceId = data.videoDeviceId;
            }
            if (typeof data.outputDeviceId === "string" || data.outputDeviceId === null) {
                this.outputDeviceId = data.outputDeviceId;
            }
            if (typeof data.outputVolume === "number") {
                this.outputVolume = Math.min(100, Math.max(0, data.outputVolume));
            }
        } catch (error) {
            logger.error("failed to load client settings", { error: String(error) });
        }
    }

    private persist() {
        const data: ClientSettingsData = {
            notificationsEnabled: this.notificationsEnabled,
            inputDeviceId: this.inputDeviceId,
            videoDeviceId: this.videoDeviceId,
            outputDeviceId: this.outputDeviceId,
            outputVolume: this.outputVolume,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            logger.error("failed to persist client settings", { error: String(error) });
        }
    }
}

interface ClientSettingsData {
    notificationsEnabled: boolean;
    inputDeviceId: string | null;
    videoDeviceId: string | null;
    outputDeviceId: string | null;
    outputVolume: number;
}

const CLIENT_SETTINGS_KEY = Symbol("client-settings");

export function setClientSettings(settings: ClientSettings): void {
    setContext(CLIENT_SETTINGS_KEY, settings);
}

export function getClientSettings(): ClientSettings {
    const settings = getContext<ClientSettings>(CLIENT_SETTINGS_KEY);
    if (!settings) {
        throw new Error(
            "ClientSettings not found in context. Make sure to call setClientSettings() in your root layout.",
        );
    }
    return settings;
}