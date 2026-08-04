<script lang="ts">
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    children,
    disabled = false,
    type = "button" as "button" | "submit" | "reset" | undefined,
    href = undefined as string | undefined,
    variant = "primary" as "primary" | "secondary" | "danger" | "ghost",
    size = "default" as "default" | "sm" | "icon",
    class: className = "",
    onclick = undefined as ((e: MouseEvent) => void) | undefined,
    title = undefined as string | undefined,
    ...restProps
  }: {
    ref?: HTMLElement | null;
    children?: import("svelte").Snippet;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    href?: string;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "default" | "sm" | "icon";
    class?: string;
    onclick?: (e: MouseEvent) => void;
    title?: string;
  } = $props();
</script>

<svelte:element
  this={href ? "a" : "button"}
  bind:this={ref}
  {disabled}
  {type}
  {href}
  {onclick}
  {title}
  class={[
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors select-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    variant === "primary" && "bg-discord-blurple text-white hover:bg-discord-blurple-hover",
    variant === "secondary" && "bg-discord-hover text-discord-text hover:bg-discord-active",
    variant === "danger" && "bg-discord-red text-white hover:opacity-80",
    variant === "ghost" && "text-discord-text-muted hover:text-discord-text hover:bg-discord-hover",
    size === "default" && "px-4 py-2 text-sm",
    size === "sm" && "px-2 py-1 text-xs",
    size === "icon" && "w-8 h-8",
    className,
  ].filter(Boolean).join(" ")}
  {...restProps}
>
  {#if children}
    {@render children()}
  {/if}
</svelte:element>
