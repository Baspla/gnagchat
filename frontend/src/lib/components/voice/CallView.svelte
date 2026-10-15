<script lang="ts">
    import { ConnectionState } from "livekit-client";
    import { getVoiceRoom } from "$lib/voice/voice-context.svelte";
    import CallControlPanel from "./CallControlPanel.svelte";

    const manager = getVoiceRoom();

    let watchingStreams = $state(new Set<string>());

    function toggleWatch(identity: string, streamType: "camera" | "screenShare") {
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

<div class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface-50-950 text-surface-contrast-50-950">
    {#if manager.state === ConnectionState.Connected}
        <header class="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div class="min-w-0">
                <h1 class="truncate text-lg font-semibold">{manager.roomDisplayName || "Voice Call"}</h1>
                <p class="text-xs text-surface-800-200">{manager.allParticipants.length} Teilnehmer</p>
            </div>
        </header>

        <main class="min-h-0 flex-1 overflow-y-auto px-3 pb-28 sm:px-6">
            <div class="grid h-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each manager.allParticipants as participant (participant.identity)}
                    <div> TODO </div>
                {/each}
            </div>
        </main>
    {:else}
        <div class="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
            <div>
                <h1 class="text-2xl font-semibold">Voice Call</h1>
                <p class="mt-2 text-sm text-surface-800-200">Tritt einem Call bei, um die Teilnehmer zu sehen.</p>
            </div>
        </div>
    {/if}

    <div class="shrink-0 px-4 pb-4 pt-2">
        <CallControlPanel />
    </div>
</div>
                    