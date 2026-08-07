<script lang="ts">
    import { Room, type ConnectionState } from 'livekit-client';
    import { env } from '$env/dynamic/public';
    import { api } from '$lib/api';

    type CallState = 'disconnected' | 'connecting' | 'connected' | 'error';

    let room: Room | undefined = $state();
    let callState: CallState = $state('disconnected');
    let isMuted: boolean = $state(false);
    let errorMessage: string | undefined = $state();

    let livekitUrl: string = $derived(env.PUBLIC_GNAGCHAT_LIVEKIT_URL || 'ws://localhost:7880');

    const stateLabel: Record<CallState, string> = {
        disconnected: 'Disconnected',
        connecting: 'Connecting…',
        connected: 'Connected',
        error: 'Error',
    };

    const stateColor: Record<CallState, string> = {
        disconnected: 'bg-gray-400',
        connecting: 'bg-yellow-400',
        connected: 'bg-green-500',
        error: 'bg-red-500',
    };

    async function joinCall() {
        if (callState === 'connected' || callState === 'connecting') return;

        callState = 'connecting';
        errorMessage = undefined;

        try {
            const res = await api.voice.token.get({
                query: { room: 'default-call' },
            });

            if (res.error) {
                const errVal = res.error.value as unknown;
                throw new Error(typeof errVal === 'string' ? errVal : 'Failed to get token');
            }

            const { token, url: backendUrl } = res.data;

            // Use the ws:// URL from the client env, not the backend's internal URL
            const wsUrl = livekitUrl;

            room = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            room.on('connected', () => {
                callState = 'connected';
            });

            room.on('disconnected', () => {
                callState = 'disconnected';
                room = undefined;
            });

            room.on('connectionStateChanged', (state: ConnectionState) => {
                if (state === 'reconnecting') {
                    callState = 'connecting';
                } else if (state === 'connected') {
                    callState = 'connected';
                } else if (state === 'disconnected') {
                    callState = 'disconnected';
                    room = undefined;
                }
            });

            await room.connect(wsUrl, token);

            // Publish local microphone track
            await room.localParticipant.enableCameraAndMicrophone();
        } catch (err) {
            console.error('Voice call error:', err);
            callState = 'error';
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
            room = undefined;
        }
    }

    async function leaveCall() {
        if (!room) return;
        room.disconnect();
        callState = 'disconnected';
        room = undefined;
    }

    function toggleMute() {
        if (!room) return;
        isMuted = !isMuted;
        room.localParticipant.setMicrophoneEnabled(!isMuted);
    }
</script>

<div class="border-t pt-2 mt-2">
    <div class="flex items-center gap-2 mb-2">
        <span class="inline-block w-2 h-2 rounded-full {stateColor[callState]}"></span>
        <span class="text-xs text-gray-400">{stateLabel[callState]}</span>
    </div>

    {#if callState === 'error' && errorMessage}
        <p class="text-xs text-red-400 mb-1">{errorMessage}</p>
    {/if}

    <div class="flex gap-2">
        {#if callState === 'connected'}
            <button
                onclick={toggleMute}
                class="text-xs px-2 py-1 rounded {isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} hover:opacity-80"
            >
                {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
                onclick={leaveCall}
                class="text-xs px-2 py-1 rounded bg-red-600 text-white hover:opacity-80"
            >
                Leave Call
            </button>
        {:else if callState === 'disconnected'}
            <button
                onclick={joinCall}
                class="text-xs px-2 py-1 rounded bg-green-600 text-white hover:opacity-80"
            >
                Join Call
            </button>
        {:else}
            <button
                disabled
                class="text-xs px-2 py-1 rounded bg-gray-600 text-gray-400 cursor-not-allowed"
            >
                Connecting…
            </button>
        {/if}
    </div>
</div>