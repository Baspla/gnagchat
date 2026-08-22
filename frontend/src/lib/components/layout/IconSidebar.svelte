<script lang="ts">
    import { page } from "$app/state";
    import IconSidebarElement from "./IconSidebarElement.svelte";
    import House from "@lucide/svelte/icons/house";
    import MessageCircle from "@lucide/svelte/icons/message-circle";
    import Folder from "@lucide/svelte/icons/folder";
    import Phone from "@lucide/svelte/icons/phone";
    import MessageSquareQuote from "@lucide/svelte/icons/message-square-quote";
</script>

<aside
    class="shrink-0 flex flex-col items-center p-3 gap-3 overflow-y-auto"
>
    <IconSidebarElement href="/"><House class="w-5 h-5" /></IconSidebarElement>

    <IconSidebarElement href="/dms" disabled><MessageCircle class="w-5 h-5" /></IconSidebarElement>

    <IconSidebarElement href="/files" disabled><Folder class="w-5 h-5" /></IconSidebarElement>

    <IconSidebarElement href="/calldebug"><Phone class="w-5 h-5" /></IconSidebarElement>

    <IconSidebarElement href="/dialogtest"><MessageSquareQuote class="w-5 h-5" /></IconSidebarElement>
</aside>