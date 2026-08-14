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
    class="flex h-screen w-screen overflow-hidden bg-white text-neutral-900 font-sans"
>
    <!-- LEFT PANEL CONTAINER (Icons + Dynamic Sidebar + Bottom Controls) -->
    <div class="flex flex-col w-78 shrink-0 border-r">
        <div class="flex flex-1 overflow-hidden">
            <IconSidebar />

            <nav class="flex-1 overflow-y-auto">
                {#if sidebar}
                    {@render sidebar()}
                {/if}
            </nav>
        </div>

        <UserControlPanel />
    </div>

    <!-- MAIN VIEWPORT (Chat Area + Online Members) -->
    <main class="flex flex-1 h-full overflow-hidden">
        {#if children}
            {@render children()}
        {/if}
    </main>
</div>
