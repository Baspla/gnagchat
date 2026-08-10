<script lang="ts">
    import { api } from "$lib/api";
    import { ReactiveRoom, attachTrack } from "$lib/livekit.svelte";
    import { onDestroy } from "svelte";

    const room = new ReactiveRoom();

    const join = async () => {
        await room.connect();
        await room.localParticipant?.setMicrophoneEnabled(true);
    };

    const toggleMute = () => {
        try {
            if (room.localParticipant) {
                room.localParticipant.setMicrophoneEnabled(
                    !room.localParticipant.isMicrophoneEnabled,
                    { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                );
            }
        } catch (error) {
            console.error("Error toggling mute:", error);
        }
    };

    const toggleCamera = () => {
        try {
            if (room.localParticipant) {
                room.localParticipant.setCameraEnabled(
                    !room.localParticipant.isCameraEnabled
                );
            }
        } catch (error) {
            console.error("Error toggling camera:", error);
        }
    };

    const toggleScreenShare = () => {
        try {
            if (room.localParticipant) {
                room.localParticipant.setScreenShareEnabled(
                    !room.localParticipant.isScreenShareEnabled,
                    {
                        audio: true, // Enable audio for screen share
                        contentHint: "detail", // Set content hint for screen share
                    }
                );
            }
        } catch (error) {
            console.error("Error toggling screen share:", error);
        }
    };

    onDestroy(() => {
        room.disconnect();
        room.destroy();
    });
</script>

<div class="m-4">
    {#if room.state === "disconnected"}
        <button
            onclick={join}
            class="bg-indigo-500 hover:bg-indigo-700 text-white p-2 rounded"
        >
            Connect
        </button>
    {:else if room.state === "connecting"}
        <button class="bg-gray-500 text-white p-2 rounded">
            Connecting...
        </button>
    {:else if room.state === "connected"}
        <button
            onclick={() => room.disconnect()}
            class="bg-red-500 hover:bg-red-700 text-white p-2 rounded"
        >
            Disconnect
        </button>
    {/if}
    {#if room.state === "connected"}
        <button
            onclick={toggleMute}
            class="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded"
        >
            {room.localParticipant?.isMicrophoneEnabled ? "Mute" : "Unmute"}
        </button>
        <button
            onclick={toggleCamera}
            class="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded"
        >
            {room.localParticipant?.isCameraEnabled
                ? "Stop Camera"
                : "Start Camera"}
        </button>
        <button
            onclick={toggleScreenShare}
            class="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded"
        >
            {room.localParticipant?.isScreenShareEnabled
                ? "Stop Screen Share"
                : "Start Screen Share"}
        </button>
    {/if}
    <p>Connection Status: {room.state}</p>
    <p>Room Name: {room.room.name}</p>
    <p>Andere im Call:</p>
    <div class="flex flex-wrap overflow-y-auto max-h-[70vh] border border-gray-200 rounded p-2 bg-gray-50">
        {#each room.allParticipants as participant (participant.identity)}
            <div class="border p-2 m-2">
                <!-- Display name, fallback to identity if name is empty -->
                <p>Name: {participant.name}</p>
                <img
                    src={participant.metadata}
                    alt="Profilepic"
                    class="w-16 h-16 rounded-full"
                />
                <p>Connection Quality: {participant.connectionQuality}</p>
                <p>Is Speaking: {participant.isSpeaking ? "Yes" : "No"}</p>
                <p>Mic: {participant.microphoneTrack ? "Yes" : "No"}</p>
                <p>Camera: {participant.cameraTrack ? "Yes" : "No"}</p>
                <p>Screen Share: {participant.screenShareTrack ? "Yes" : "No"}</p>
                <p>Screen Share Audio: {participant.screenShareAudioTrack ? "Yes" : "No"}</p>
                <audio
                    use:attachTrack={participant.microphoneTrack?.track}
                    muted={participant.isLocalParticipant}
                    autoplay
                ></audio>
                {#if participant.cameraTrack?.isSubscribed}
                    <video
                        use:attachTrack={participant.cameraTrack?.track}
                        muted={participant.isLocalParticipant}
                        autoplay
                    ></video>
                {/if}
                {#if participant.screenShareTrack?.isSubscribed}
                    <video
                        use:attachTrack={participant.screenShareTrack?.track}
                        muted={participant.isLocalParticipant}
                        autoplay
                    ></video>
                    {#if participant.screenShareAudioTrack?.isSubscribed}
                        <audio
                            use:attachTrack={participant.screenShareAudioTrack?.track}
                            muted={participant.isLocalParticipant}
                            autoplay
                        ></audio>
                    {/if}
                {/if}
            </div>
        {/each}
    </div>
</div>
