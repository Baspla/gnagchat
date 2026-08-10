<script lang="ts">
    import { api } from "$lib/api";
    import { ReactiveRoom, attachTrack} from "$lib/livekit.svelte";
    import { onDestroy } from "svelte";

    const room = new ReactiveRoom();

    const join = async () => {
        await room.connect();
        await room.localParticipant?.setMicrophoneEnabled(true);
    };

    onDestroy(() => {
        room.disconnect();
        room.destroy();
    });
</script>

<div class="m-4">
    {#if room.state === 'disconnected'}
        <button onclick={join} class="bg-indigo-500 hover:bg-indigo-700 text-white p-2 rounded">
            Connect
        </button>
    {:else if room.state === 'connecting'}
        <button class="bg-gray-500 text-white p-2 rounded">
            Connecting...
        </button>
    {:else if room.state === 'connected'}
        <button onclick={() => room.disconnect()} class="bg-red-500 hover:bg-red-700 text-white p-2 rounded">
            Disconnect
        </button>
    {/if}
    <p>Connection Status: {room.state}</p>
    <p>Room Name: {room.room.name}</p>
    <p>Andere im Call:</p>
    {#each room.remoteParticipants as participant (participant.identity)}
        <div class="border p-2 m-2">
            <!-- Display name, fallback to identity if name is empty -->
            <p>Name: {participant.name}</p>
            <p>Identity: {participant.identity}</p>
            <p>Permissions: {JSON.stringify(participant.permissions)}</p>
            <p>Connection Quality: {participant.connectionQuality}</p>
            <p>Metadata: {participant.metadata}</p>
            <p>Is Speaking: {participant.isSpeaking ? "Yes" : "No"}</p>
            <audio 
               use:attachTrack={participant.microphoneTrack?.track} 
               muted={participant === room.localParticipant} 
               autoplay
            ></audio>
            
        </div>
    {/each}
</div>
