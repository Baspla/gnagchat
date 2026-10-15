<script lang="ts">
    import { ConnectionState } from "livekit-client";
    import Camera from "@lucide/svelte/icons/camera";
    import CameraOff from "@lucide/svelte/icons/camera-off";
    import Headphones from "@lucide/svelte/icons/headphones";
    import HeadphoneOff from "@lucide/svelte/icons/headphone-off";
    import Mic from "@lucide/svelte/icons/mic";
    import MicOff from "@lucide/svelte/icons/mic-off";
    import MonitorUp from "@lucide/svelte/icons/monitor-up";
    import PhoneOff from "@lucide/svelte/icons/phone-off";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";

    const manager = getVoiceRoom();

    const btnIcon = "h-5 w-5";
</script>

<div class="flex items-center justify-center">
    {#if manager.state === ConnectionState.Disconnected}
        <div class="flex items-center gap-2 rounded-2xl bg-surface-200-800 px-4 py-3 shadow-sm">
            <button
                class="btn preset-filled p-2 rounded"
                onclick={() => manager.joinRoom("default-room", "Default Room")}
            >
                Verbinden
            </button>
        </div>
    {:else if manager.state === ConnectionState.Connecting}
        <div class="rounded-2xl bg-surface-200-800 px-4 py-3 shadow-sm">
            <span class="text-sm text-surface-contrast-200-800">Verbinde...</span>
        </div>
    {:else if manager.state === ConnectionState.Reconnecting || manager.state === ConnectionState.SignalReconnecting}
        <div class="flex items-center gap-2 rounded-2xl bg-surface-200-800 px-4 py-3 shadow-sm">
            <span class="text-sm text-surface-contrast-200-800">Verbindung wird wiederhergestellt...</span>
            <button
                class="btn preset-filled-error-500 p-2 rounded"
                onclick={() => manager.leaveRoom()}
            >
                <PhoneOff class={btnIcon} />
            </button>
        </div>
    {:else if manager.state === ConnectionState.Connected}
        <div class="flex items-center gap-2 rounded-2xl bg-surface-200-800 px-4 py-2 shadow-sm">
            <button
                class="btn h-10 w-10 rounded-full p-0 flex items-center justify-center"
                class:bg-error-500={!manager.canSpeak}
                class:bg-primary-500={manager.canSpeak}
                class:preset-filled={manager.canSpeak}
                class:preset-filled-error-500={!manager.canSpeak}
                title={manager.canSpeak ? "Mikrofon stummschalten" : "Mikrofon einschalten"}
                onclick={() => manager.toggleMute()}
            >
                {#if manager.canSpeak}<Mic class={btnIcon} />{:else}<MicOff class={btnIcon} />{/if}
            </button>
            <button
                class="btn h-10 w-10 rounded-full p-0 flex items-center justify-center"
                class:bg-error-500={!manager.canHear}
                class:bg-primary-500={manager.canHear}
                class:preset-filled={manager.canHear}
                class:preset-filled-error-500={!manager.canHear}
                title={manager.canHear ? "Ton ausschalten" : "Ton einschalten"}
                onclick={() => manager.toggleDeafen()}
            >
                {#if manager.canHear}<Headphones class={btnIcon} />{:else}<HeadphoneOff class={btnIcon} />{/if}
            </button>
            <button
                class="btn h-10 w-10 rounded-full p-0 flex items-center justify-center bg-primary-500 preset-filled"
                title="Kamera umschalten"
                onclick={() => manager.toggleCamera()}
                class:bg-primary-500={manager.localParticipant?.isCameraEnabled}
                class:bg-surface-500={!manager.localParticipant?.isCameraEnabled}
            >
                {#if manager.localParticipant?.isCameraEnabled}<Camera class={btnIcon} />{:else}<CameraOff class={btnIcon} />{/if}
            </button>
            <button
                class="btn h-10 w-10 rounded-full p-0 flex items-center justify-center bg-primary-500 preset-filled"
                title="Bildschirm teilen"
                onclick={() => manager.toggleScreenShare()}
            >
                <MonitorUp class={btnIcon} />
            </button>
            <div class="h-6 w-px bg-surface-800-200/50"></div>
            <button
                class="btn preset-filled-error-500 h-10 w-10 rounded-full p-0 flex items-center justify-center"
                title="Call verlassen"
                onclick={() => manager.leaveRoom()}
            >
                <PhoneOff class={btnIcon} />
            </button>
        </div>
    {:else}
        <div class="rounded-2xl bg-surface-200-800 px-4 py-3 shadow-sm">
            <span class="text-sm text-surface-contrast-200-800">{manager.state}</span>
        </div>
    {/if}
</div>