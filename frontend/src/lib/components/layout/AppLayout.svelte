<script lang="ts">
    import type { Snippet } from "svelte";
    import UserControlPanel from "./UserControlPanel.svelte";
    import IconSidebar from "./IconSidebar.svelte";

    let {
        children,
        sidebar,
    }: {
        children?: Snippet;
        sidebar?: Snippet;
    } = $props();
</script>

<div
    class="flex h-screen w-screen overflow-hidden bg-surface-200-800 text-surface-contrast-200-800 font-sans"
>
    <div class="flex flex-col w-78 shrink-0">
        <div class="flex flex-1 overflow-hidden">
            <IconSidebar />

            <nav class="flex-1 overflow-y-auto bg-surface-100-900">
                {#if sidebar}
                    {@render sidebar()}
                {/if}
            </nav>
        </div>

        <UserControlPanel />
    </div>

    <main class="flex flex-1 h-full overflow-hidden bg-surface-50-950">
        {#if children}
            {@render children()}
        {/if}
    </main>
</div>
