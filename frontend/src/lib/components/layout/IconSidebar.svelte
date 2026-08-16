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

    <IconSidebarElement href="/calldebug">☎️</IconSidebarElement>
</aside>
