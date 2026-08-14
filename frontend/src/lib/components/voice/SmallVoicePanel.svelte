<script lang="ts">
    import { ConnectionState } from "livekit-client";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";

    const manager = getVoiceRoom();

</script>

<div class="flex flex-col gap-2 p-2 border border-gray-500 rounded bg-gray-50 text-sm">
    {#if manager.state === ConnectionState.Disconnected}
        <div class="flex gap-1">
            <p class="text-gray-500">In keinem Call</p>
        </div>
    {:else if manager.state === ConnectionState.Connecting}
        <p class="text-gray-500 text-center">Connecting...</p>
    {:else if manager.state === ConnectionState.Connected}
        <div class="flex items-center gap-2">
            <div
                class="w-2 h-2 rounded-full bg-green-500"
                title="Connected"
            ></div>
            <span class="font-medium truncate">{manager.currentRoomName}</span>
            <span class="text-gray-400 text-xs">
                ({manager.allParticipants.length})
            </span>
        </div>
        <div class="flex gap-1 flex-wrap">
            <button
                onclick={() => manager.toggleMute()}
                class="px-2 py-1 rounded text-xs"
                class:bg-red-500={!manager.localParticipant?.isMicrophoneEnabled}
                class:bg-blue-500={manager.localParticipant?.isMicrophoneEnabled}
                class:hover:bg-red-700={!manager.localParticipant?.isMicrophoneEnabled}
                class:hover:bg-blue-700={manager.localParticipant?.isMicrophoneEnabled}
                class:text-white={true}
            >
                {manager.localParticipant?.isMicrophoneEnabled ? "Mute" : "Unmute"}
            </button>
            <button
                onclick={() => manager.leaveRoom()}
                class="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded text-xs"
            >
                Leave
            </button>
        </div>
    {:else if manager.state === ConnectionState.Reconnecting}
        <p class="text-yellow-500 text-center">Reconnecting...</p>
    {:else}
        <p class="text-gray-500 text-center">{manager.state}</p>
    {/if}
</div>