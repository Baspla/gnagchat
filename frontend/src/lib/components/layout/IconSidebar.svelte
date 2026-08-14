<script lang="ts">
    import { page } from "$app/state";
    import IconSidebarElement from "./IconSidebarElement.svelte";
</script>

<aside
    class="shrink-0 flex flex-col items-center p-3 gap-3 overflow-y-auto"
>
    <IconSidebarElement href="/">🏠</IconSidebarElement>

    <IconSidebarElement href="/dms" disabled>💬</IconSidebarElement>

    <IconSidebarElement href="/files" disabled>📁</IconSidebarElement>

    <p class="text-sm font-medium border-t w-full text-center">Test</p>

    <IconSidebarElement href="/calldebug">☎️</IconSidebarElement>

    <IconSidebarElement href="/logger">🧩</IconSidebarElement>
</aside>
