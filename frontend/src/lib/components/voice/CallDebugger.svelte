<script lang="ts">
    import { attachTrack } from "$lib/livekit.svelte";
    import { ConnectionState } from "livekit-client";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";

    const manager = getVoiceRoom();

    let watchingStreams = $state(new Set<string>());

    function toggleWatchScreen(
        identity: string,
        streamType: "camera" | "screenShare",
    ) {
        const next = new Set(watchingStreams);
        const key = `${identity}-${streamType}`;
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        watchingStreams = next;
    }
</script>

<div class="m-4 overflow-y-auto max-h-full">
    {#if manager.state === ConnectionState.Disconnected}
        <button
            onclick={() => manager.joinRoom("default-room")}
            class="btn bg-indigo-500 hover:bg-indigo-700 text-white p-2 rounded"
        >
            Connect
        </button>
    {:else if manager.state === ConnectionState.Connecting}
        <button class="btn bg-gray-500 text-white p-2 rounded">
            Connecting...
        </button>
    {:else if manager.state === ConnectionState.Connected}
        <button
            onclick={() => manager.leaveRoom()}
            class="btn bg-red-500 hover:bg-red-700 text-white p-2 rounded"
        >
            Disconnect
        </button>
    {:else if manager.state === ConnectionState.Reconnecting}
        <button class="btn bg-yellow-500 text-white p-2 rounded">
            Reconnecting...
        </button>
    {:else if manager.state === ConnectionState.SignalReconnecting}
        <button class="btn bg-yellow-500 text-white p-2 rounded">
            Signal Reconnecting...
        </button>
    {:else}
        <button class="btn bg-gray-500 text-white p-2 rounded">
            Unknown State
        </button>
    {/if}
    {#if manager.state === ConnectionState.Connected}
        <button
            onclick={() => manager.toggleMute()}
            class="btn preset-filled  p-2 rounded"
        >
            {manager.localParticipant?.isMicrophoneEnabled ? "Mute" : "Unmute"}
        </button>
        <button
            onclick={() => manager.toggleCamera()}
            class="btn preset-filled  p-2 rounded"
        >
            {manager.localParticipant?.isCameraEnabled
                ? "Stop Camera"
                : "Start Camera"}
        </button>
        <button
            onclick={() => manager.toggleScreenShare()}
            class="btn preset-filled  p-2 rounded"
        >
            {manager.localParticipant?.isScreenShareEnabled
                ? "Stop Screen Share"
                : "Start Screen Share"}
        </button>
    {/if}
    <p>Connection Status: {manager.state}</p>
    {#if manager.state === ConnectionState.Connected}
        <p>Room Name: {manager.currentRoomName}</p>
        <p>Alle im Call:</p>
        <div
            class="flex flex-wrap border rounded p-2 "
        >
            {#each manager.allParticipants as participant (participant.identity)}
                <div class="border p-2 m-2">
                    <!-- Display name, fallback to identity if name is empty -->
                    <p>Name: {participant.name}</p>
                    <img
                        src={participant.attributes.image}
                        alt="Profilepic"
                        class="w-16 h-16 rounded-full transition-all duration-100 ease-in-out"
                        class:border-4={participant.isSpeaking}
                        class:border-green-500={participant.isSpeaking}
                    />
                    <p>Attributes:</p>
                    <ul>
                        {#each Object.entries(participant.attributes) as [key, value]}
                            <li>- {key}: {value}</li>
                        {/each}
                    </ul>
                    <p>
                        Metadata: {participant.metadata}
                    </p>
                    <p>Room: {manager.currentRoomName}</p>
                    <p>Connection Quality: {participant.connectionQuality}</p>
                    <p>Is Speaking: {participant.isSpeaking ? "Yes" : "No"}</p>
                    <p>Mic: {participant.microphoneTrack ? "Yes" : "No"}</p>
                    <p>Camera: {participant.cameraTrack ? "Yes" : "No"}</p>
                    <p>
                        Screen Share: {participant.screenShareTrack
                            ? "Yes"
                            : "No"}
                    </p>
                    <p>
                        Screen Share Audio: {participant.screenShareAudioTrack
                            ? "Yes"
                            : "No"}
                    </p>
                    {#if !participant.isLocalParticipant}
                        <audio
                            use:attachTrack={participant.microphoneTrack?.track}
                            autoplay
                        ></audio>
                    {/if}
                    {#if participant.cameraTrack}
                        {#if watchingStreams.has(`${participant.identity}-camera`)}
                            <video
                                use:attachTrack={participant.cameraTrack?.track}
                                autoplay
                            ></video>
                            <button
                                onclick={() =>
                                    toggleWatchScreen(
                                        participant.identity,
                                        "camera",
                                    )}
                                class="bg-yellow-500 hover:bg-yellow-700 text-white p-2 rounded"
                            >
                                Stop Watching Camera
                            </button>
                        {:else}
                            <button
                                onclick={() =>
                                    toggleWatchScreen(
                                        participant.identity,
                                        "camera",
                                    )}
                                class="bg-green-500 hover:bg-green-700 text-white p-2 rounded"
                            >
                                Watch Camera
                            </button>
                        {/if}
                    {/if}
                    {#if participant.screenShareTrack}
                        {#if watchingStreams.has(`${participant.identity}-screenShare`)}
                            <video
                                use:attachTrack={participant.screenShareTrack
                                    ?.track}
                                muted={participant.isLocalParticipant}
                                autoplay
                            ></video>
                            {#if participant.screenShareAudioTrack}
                                <audio
                                    use:attachTrack={participant
                                        .screenShareAudioTrack?.track}
                                    muted={participant.isLocalParticipant}
                                    autoplay
                                ></audio>
                            {/if}
                            <button
                                onclick={() =>
                                    toggleWatchScreen(
                                        participant.identity,
                                        "screenShare",
                                    )}
                                class="bg-yellow-500 hover:bg-yellow-700 text-white p-2 rounded"
                            >
                                Stop Watching Screen Share
                            </button>
                        {:else}
                            <button
                                onclick={() =>
                                    toggleWatchScreen(
                                        participant.identity,
                                        "screenShare",
                                    )}
                                class="bg-green-500 hover:bg-green-700 text-white p-2 rounded"
                            >
                                Watch Screen Share
                            </button>
                        {/if}
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>