<script lang="ts">
    import { authClient } from "$lib/auth-client";
    import { attachTrack } from "$lib/livekit.svelte";
    import { ConnectionState } from "livekit-client";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import type { LayoutData } from "../../../routes/(app)/$types";
    import { page } from "$app/state";
    import Lightswitch from "../Lightswitch.svelte";
    import { createLogger } from "$lib/logger";
    import Link from "@lucide/svelte/icons/link";
    import Monitor from "@lucide/svelte/icons/monitor";
    import Camera from "@lucide/svelte/icons/camera";
    import Mic from "@lucide/svelte/icons/mic";
    import MicOff from "@lucide/svelte/icons/mic-off";
    import Headphones from "@lucide/svelte/icons/headphones";
    import HeadphoneOff from "@lucide/svelte/icons/headphone-off";
    import Settings from "@lucide/svelte/icons/settings";
    import PhoneOff from "@lucide/svelte/icons/phone-off";
    import { toaster } from "$lib/toaster";

    const logger = createLogger("user-control-panel");
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

    async function toggleDeafen() {
        manager.toggleDeafen();
    }

    async function toggleCamera() {
        manager.toggleCamera();
    }

    async function toggleScreenShare() {
        manager.toggleScreenShare();
    }

    async function copyInviteLink() {
        const inviteUrl = `${page.url.origin}/joincall?roomid=${encodeURIComponent(manager.currentRoomName)}`;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            toaster.success({
                title: "Invite Link Copied",
                description: "The invite link has been copied to your clipboard.",
                duration: 3000
            });
            logger.info("invite link copied to clipboard", { inviteUrl });
        } catch (error) {
            logger.error("failed to copy invite link", { error: String(error) });
        }
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
            <button class="hover:shadow-md rounded-md" title="Disconnect" onclick={leaveRoom}>
                <PhoneOff class="w-4 h-4" />
            </button>
        {:else if manager.state === ConnectionState.Connected}
            <div class="flex items-center gap-2">
                <div
                    class="w-2 h-2 rounded-full bg-green-500"
                    title="Connected"
                ></div>
                <span class="truncate">{manager.roomDisplayName}</span>
                <button class="hover:shadow-md rounded-md text-xs" title="Copy invite link" onclick={copyInviteLink}>
                    <Link class="w-4 h-4" />
                </button>
            </div>
            <div class="flex items-center gap-2">
                <button class="hover:shadow-md rounded-md p-1" title="Share Screen" onclick={toggleScreenShare}>
                    <Monitor class="w-4 h-4" />
                </button>
                <button class="hover:shadow-md rounded-md p-1" title="Camera" onclick={toggleCamera}>
                    <Camera class="w-4 h-4" />
                </button>
                <button class="hover:shadow-md rounded-md p-1" title="Leave Room" onclick={leaveRoom}>
                    <PhoneOff class="w-4 h-4" />
                </button>
            </div>
        {:else if manager.state === ConnectionState.Reconnecting}
            <p class="text-yellow-500 text-center">Reconnecting...</p>
            <button class="hover:shadow-md rounded-md" title="Disconnect" onclick={leaveRoom}>
                <PhoneOff class="w-4 h-4" />
            </button>
        {:else}
            <p class="text-gray-500 text-center">{manager.state}</p>
            <button class="hover:shadow-md rounded-md" title="Disconnect" onclick={leaveRoom}>
                <PhoneOff class="w-4 h-4" />
            </button>
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
            <button class="hover:shadow-md rounded-md p-1" title="Mute" onclick={toggleMute} class:bg-error-500={!manager.canSpeak}>
                {#if manager.canSpeak}
                    <Mic class="w-4 h-4" />
                {:else}
                    <MicOff class="w-4 h-4" />
                {/if}
            </button>
            <button class="hover:shadow-md rounded-md p-1" title="Deafen" onclick={toggleDeafen} class:bg-error-500={!manager.canHear}>
                {#if manager.canHear}
                    <Headphones class="w-4 h-4" />
                {:else}
                    <HeadphoneOff class="w-4 h-4" />
                {/if}
            </button>
            <button class="hover:shadow-md rounded-md p-1" title="Settings" onclick={logout}>
                <Settings class="w-4 h-4" />
            </button>
            <!--<Lightswitch />-->
        </div>
    </div>
</footer>

<!-- Hidden audio elements for remote participants -->
{#if manager.state === ConnectionState.Connected}
    {#each manager.allParticipants as participant (participant.identity)}
        {#if !participant.isLocalParticipant}
            <audio
                use:attachTrack={participant.microphoneTrack?.track}
                autoplay
                muted={!manager.canHear}
            ></audio>
        {/if}
    {/each}
{/if}