<script lang="ts">
    import type { DtoVoiceUser } from "$shared/dto/voice-room";

    let { users }: { users: DtoVoiceUser[] } = $props();
</script>

<div class="flex flex-wrap gap-1 mt-1">
    {#each users as user (user.userId)}
        <span
            class="text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 flex items-center gap-1"
        >
            {#if user.avatarUrl}
                <img src={user.avatarUrl} alt="" class="w-3 h-3 rounded-full" />
            {:else}
                <span class="w-3 h-3 rounded-full bg-gray-600 inline-block"></span>
            {/if}
            {user.name}
            {#if user.devices.length > 1}
                <span class="text-[10px] text-gray-400">
                    +{user.devices.length - 1}
                </span>
            {/if}
        </span>
    {/each}
</div>