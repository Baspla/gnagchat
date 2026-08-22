<script lang="ts">
    import type { Snippet } from "svelte";
    import { page } from "$app/state";

    let {
        href,
        disabled = false,
        children,
    }: {
        href: string;
        disabled?: boolean;
        children?: Snippet;
    } = $props();

    const fallbackLetter = $derived(href.charAt(1).toUpperCase());

    
    const isActive = (href: string) => {
        if (href === "/"){ 
            // Special case für /channel
            return page.url.pathname === "/" || page.url.pathname.startsWith("/channel");
        }
        return page.url.pathname.startsWith(href);
    };
</script>

<a
    href={disabled ? undefined : href}
    class="w-12 h-12 rounded-2xl hover:rounded-xl flex items-center justify-center transition-all shadow-sm"
    class:bg-blue-600={isActive(href)}
    class:rounded-xl={isActive(href)}
    class:hover:bg-slate-100={!isActive(href)}
>
    {#if children}
        {@render children()}
    {:else}
        {fallbackLetter}
    {/if}
</a>
