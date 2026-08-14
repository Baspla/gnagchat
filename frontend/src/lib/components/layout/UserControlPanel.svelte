<script lang="ts">
    import { authClient } from "$lib/auth-client";
    import { ConnectionState } from "livekit-client";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import type { LayoutData } from "../../../routes/(app)/$types";
    import Lightswitch from "../Lightswitch.svelte";

    const manager = getVoiceRoom();

    const session = authClient.useSession();
    const user = $derived($session.data?.user ?? null);

    async function logout() {
        await authClient.signOut();
        window.location.href = "/login";
    }

    async function leaveRoom() {
        await manager.leaveRoom();
    }

    async function toggleMute() {
        manager.toggleMute();
    }

    async function toggleCamera() {
        manager.toggleCamera();
    }

    async function toggleScreenShare() {
        manager.toggleScreenShare();
    }
</script>

<!-- Voice / Status Row -->

<footer
    class=" flex flex-col justify-center p-3 gap-1"
>
    <div class="flex items-center justify-between">
        {#if manager.state === ConnectionState.Disconnected}
            <div></div>
        {:else if manager.state === ConnectionState.Connecting}
            <p class="text-gray-500 text-center">Connecting...</p>
        {:else if manager.state === ConnectionState.Connected}
            <div class="flex items-center gap-2">
                <div
                    class="w-2 h-2 rounded-full bg-green-500"
                    title="Connected"
                ></div>
                <span class="truncate">{manager.currentRoomName}</span>
                <span class="text-gray-400 text-xs">
                    ({manager.allParticipants.length})
                </span>
            </div>
            <div class="flex items-center gap-2">
                <button class="hover:shadow-md rounded-md" title="Share Screen" onclick={toggleScreenShare}>
                    🖥️
                </button>
                <button class="hover:shadow-md rounded-md" title="Camera" onclick={toggleCamera}>
                    📷
                </button>
                <button class="hover:shadow-md rounded-md" title="Leave Room" onclick={leaveRoom}>
                    ❌
                </button>
            </div>
        {:else if manager.state === ConnectionState.Reconnecting}
            <p class="text-yellow-500 text-center">Reconnecting...</p>
        {:else}
            <p class="text-gray-500 text-center">{manager.state}</p>
        {/if}
    </div>

    <!-- User Profile & Actions Row -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <img
                src={user?.image ?? "/default-avatar.png"}
                alt="User Avatar"
                class="w-8 h-8 rounded-full border-2 transition-all duration-300 ease-in-out"
                class:border-green-500={manager.localParticipant?.isSpeaking}
                class:border-transparent={!manager.localParticipant?.isSpeaking}
            />
            <span class="font-bold">{user?.name ?? "User"}</span>
        </div>

        <div class="flex items-center gap-2">
            <button class="hover:shadow-md rounded-md" title="Mute" onclick={toggleMute} class:bg-red-200={!manager.localParticipant?.isMicrophoneEnabled}>
                🎙️
            </button>
            <button class="hover:shadow-md rounded-md" title="Deafen">
                🎧
            </button>
            <button class="hover:shadow-md rounded-md" title="Settings" onclick={logout}>
                ⚙️
            </button>
            <Lightswitch />
        </div>
    </div>
</footer>
