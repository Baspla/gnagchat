<script lang="ts">
    import { getClientSettings } from "$lib/settings/client-settings.svelte";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import { ReactiveRoom } from "$lib/livekit.svelte";
    import { ConnectionState } from "livekit-client";
    import { authClient } from "$lib/auth-client";
    import { page } from "$app/state";
    import { toaster } from "$lib/toaster";
    import { createLogger } from "$lib/logger";
    import { Switch } from "@skeletonlabs/skeleton-svelte";
    import { THEMES, THEME_MODES, themeManager } from "$lib/settings/theme.svelte";
    import UserRound from "@lucide/svelte/icons/user-round";
    import MicVocal from "@lucide/svelte/icons/mic-vocal";
    import Bell from "@lucide/svelte/icons/bell";
    import Palette from "@lucide/svelte/icons/palette";
    import LogOut from "@lucide/svelte/icons/log-out";
    import Sun from "@lucide/svelte/icons/sun";
    import Moon from "@lucide/svelte/icons/moon";
    import Monitor from "@lucide/svelte/icons/monitor";

    const logger = createLogger("user-settings-view");
    const manager = getVoiceRoom();
    const settings = getClientSettings();

    const user = $derived(page.data.user ?? null);

    type SettingsSection = "profile" | "voice-video" | "notifications" | "appearance";

    const sections: { id: SettingsSection; label: string; icon: typeof UserRound }[] = [
        { id: "profile", label: "Profil", icon: UserRound },
        { id: "voice-video", label: "Sprache & Video", icon: MicVocal },
        { id: "notifications", label: "Benachrichtigungen", icon: Bell },
        { id: "appearance", label: "Aussehen", icon: Palette },
    ];

    let activeSection = $state<SettingsSection>("profile");

    async function logout() {
        await authClient.signOut();
        window.location.href = "/login";
    }

    // --- Devices ---
    const DEVICE_ERROR_MESSAGE = "Konnte keine Mediengeräte abrufen. Bitte überprüfe die Berechtigungen.";

    function createDeviceLoader(kind: MediaDeviceKind) {
        let devices = $state<MediaDeviceInfo[]>([]);
        let error = $state<string | null>(null);
        let loaded = $state(false);

        async function load() {
            error = null;
            try {
                // Requesting permissions ensures device labels are available
                devices = await ReactiveRoom.getLocalDevices(kind, true);
                loaded = true;
            } catch (err) {
                logger.error("failed to enumerate media devices", { kind, error: String(err) });
                error = DEVICE_ERROR_MESSAGE;
            }
        }

        return {
            kind,
            get devices() { return devices; },
            get error() { return error; },
            get loaded() { return loaded; },
            load,
        };
    }

    const inputLoader = createDeviceLoader("audioinput");
    const videoLoader = createDeviceLoader("videoinput");
    const outputLoader = createDeviceLoader("audiooutput");

    $effect(() => {
        if (activeSection === "voice-video") {
            if (!inputLoader.loaded) void inputLoader.load();
            if (!videoLoader.loaded) void videoLoader.load();
            if (!outputLoader.loaded) void outputLoader.load();
        }
    });

    async function switchDevice(kind: MediaDeviceKind, deviceId: string | null) {
        if (!deviceId) return;
        try {
            if (manager.state === ConnectionState.Connected) {
                await manager.room.switchActiveDevice(kind, deviceId);
            }
            logger.info("switched active device", { kind, deviceId });
        } catch (error) {
            logger.error("failed to switch active device", { kind, deviceId, error: String(error) });
            toaster.error({
                title: "Device Switch Failed",
                description: "Could not switch to the selected device.",
            });
        }
    }

    function onInputDeviceChange(event: Event) {
        const value = (event.currentTarget as HTMLSelectElement).value || null;
        settings.inputDeviceId = value;
        void switchDevice("audioinput", value);
    }

    function onVideoDeviceChange(event: Event) {
        const value = (event.currentTarget as HTMLSelectElement).value || null;
        settings.videoDeviceId = value;
        void switchDevice("videoinput", value);
    }

    function onOutputDeviceChange(event: Event) {
        const value = (event.currentTarget as HTMLSelectElement).value || null;
        settings.outputDeviceId = value;
        void switchDevice("audiooutput", value);
    }
</script>

<div class="flex h-[28rem] gap-4">
    <!-- Section Navigation -->
    <nav class="flex w-48 shrink-0 flex-col gap-1">
        {#each sections as section (section.id)}
            <button
                class="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors
                    {activeSection === section.id
                        ? 'bg-primary-500 text-primary-contrast-500'
                        : 'hover:bg-surface-100 hover:text-surface-contrast-100'}"
                onclick={() => activeSection = section.id}
            >
                <section.icon class="h-4 w-4" />
                {section.label}
            </button>
        {/each}
    </nav>

    <!-- Section Content -->
    <div class="flex-1 overflow-y-auto pr-1">
        {#if activeSection === "profile"}
            <div class="flex flex-col gap-6">
                <div class="flex items-center gap-4">
                    <img
                        src={user?.image ?? "/default-avatar.png"}
                        alt="User Avatar"
                        class="h-16 w-16 rounded-full border-2 border-surface-200-800"
                    />
                    <div>
                        <p class="font-bold">{user?.name ?? "User"}</p>
                        <p class="text-sm text-surface-contrast-400-800">{user?.email}</p>
                    </div>
                </div>

                <label class="flex flex-col gap-1">
                    <span class="text-sm font-semibold">Sprache</span>
                    <select class="select" disabled>
                        <option>Deutsch</option>
                    </select>
                </label>

                <div class="border-t border-surface-200 pt-4">
                    <button
                        class="btn preset-outlined-error flex items-center gap-2"
                        onclick={logout}
                    >
                        <LogOut class="h-4 w-4" />
                        Abmelden
                    </button>
                </div>
            </div>
        {:else if activeSection === "voice-video"}
            <div class="flex flex-col gap-6">
                <label class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold">Mikrofon</span>
                        {#if inputLoader.error}
                            <button
                                class="btn preset-outlined text-xs px-2 py-0.5"
                                onclick={() => inputLoader.load()}
                            >
                            Erneut versuchen
                            </button>
                        {/if}
                    </div>
                    {#if inputLoader.error}
                        <p class="text-sm text-error-500">{inputLoader.error}</p>
                    {:else}
                        <select
                            class="select"
                            value={settings.inputDeviceId ?? ""}
                            onchange={onInputDeviceChange}
                        >
                            <option value="">Default</option>
                            {#each inputLoader.devices as device (device.deviceId)}
                                <option value={device.deviceId}>{device.label || "Mikrofon"}</option>
                            {/each}
                        </select>
                    {/if}
                </label>

                <label class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold">Kamera</span>
                        {#if videoLoader.error}
                            <button
                                class="btn preset-outlined text-xs px-2 py-0.5"
                                onclick={() => videoLoader.load()}
                            >
                            Erneut versuchen
                            </button>
                        {/if}
                    </div>
                    {#if videoLoader.error}
                        <p class="text-sm text-error-500">{videoLoader.error}</p>
                    {:else}
                        <select
                            class="select"
                            value={settings.videoDeviceId ?? ""}
                            onchange={onVideoDeviceChange}
                        >
                            <option value="">Default</option>
                            {#each videoLoader.devices as device (device.deviceId)}
                                <option value={device.deviceId}>{device.label || "Kamera"}</option>
                            {/each}
                        </select>
                    {/if}
                </label>

                <label class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold">Lautsprecher</span>
                        {#if outputLoader.error}
                            <button
                                class="btn preset-outlined text-xs px-2 py-0.5"
                                onclick={() => outputLoader.load()}
                            >
                            Erneut versuchen
                            </button>
                        {/if}
                    </div>
                    {#if outputLoader.error}
                        <p class="text-sm text-error-500">{outputLoader.error}</p>
                    {:else}
                        <select
                            class="select"
                            value={settings.outputDeviceId ?? ""}
                            onchange={onOutputDeviceChange}
                        >
                            <option value="">Default</option>
                            {#each outputLoader.devices as device (device.deviceId)}
                                <option value={device.deviceId}>{device.label || "Lautsprecher"}</option>
                            {/each}
                        </select>
                    {/if}
                </label>

                <label class="flex flex-col gap-1">
                    <span class="text-sm font-semibold">Output Volume ({settings.outputVolume}%)</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        bind:value={settings.outputVolume}
                        class="w-full accent-primary-500"
                    />
                </label>
            </div>
        {:else if activeSection === "notifications"}
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <p class="font-semibold">Web Push Benachrichtigungen</p>
                        <p class="text-sm text-surface-contrast-400-800">
                            Erhalte Benachrichtigungen über den Browser.
                        </p>
                    </div>
                    <Switch
                        checked={settings.notificationsEnabled}
                        onCheckedChange={(event) => settings.notificationsEnabled = event.checked}
                    >
                        <Switch.Control>
                            <Switch.Thumb />
                        </Switch.Control>
                        <Switch.HiddenInput />
                    </Switch>
                </div>
                <p class="text-xs text-surface-contrast-400-800">
                    Das ist noch in Arbeit.
                </p>
            </div>
        {:else if activeSection === "appearance"}
            <div class="flex flex-col gap-6">
                <div>
                    <p class="font-semibold">Farbmodus</p>
                    <p class="text-sm text-surface-contrast-400-800">
                        Wähle zwischen hellem, dunklem oder dem Systemmodus.
                    </p>
                    <div class="mt-2 grid grid-cols-3 gap-1 rounded-md bg-surface-100-900 p-1">
                        {#each THEME_MODES as modeOption (modeOption.id)}
                            <button
                                class="flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors
                                    {themeManager.mode === modeOption.id
                                        ? 'bg-primary-500 text-primary-contrast-500'
                                        : 'hover:bg-surface-200-800 '}"
                                onclick={() => themeManager.mode = modeOption.id}
                            >
                                {#if modeOption.id === "light"}
                                    <Sun class="h-4 w-4" />
                                {:else if modeOption.id === "dark"}
                                    <Moon class="h-4 w-4" />
                                {:else}
                                    <Monitor class="h-4 w-4" />
                                {/if}
                                {modeOption.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <div>
                    <p class="font-semibold">Farbschema</p>
                    <p class="text-sm text-surface-contrast-400-800">
                        Wähle das Farbschema der Anwendung.
                    </p>
                    <div class="mt-2 grid grid-cols-3 gap-2">
                        {#each THEMES as themeOption (themeOption.id)}
                            <button
                                class="flex flex-col gap-1.5 rounded-md border p-2 text-left text-sm transition-colors
                                    {themeManager.theme === themeOption.id
                                        ? 'border-primary-500 ring-1 ring-primary-500'
                                        : 'border-surface-200-800 hover:border-surface-400-600'}"
                                onclick={() => themeManager.theme = themeOption.id}
                            >
                                <span
                                    data-theme={themeOption.id}
                                    class="flex h-8 overflow-hidden rounded"
                                >
                                    <span class="flex-1 bg-primary-500"></span>
                                    <span class="flex-1 bg-secondary-500"></span>
                                    <span class="flex-1 bg-surface-500"></span>
                                </span>
                                {themeOption.label}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>