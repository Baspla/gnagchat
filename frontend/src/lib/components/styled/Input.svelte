<script lang="ts">
  let {
    ref = $bindable(null),
    value = $bindable(""),
    placeholder = "",
    label = "",
    disabled = false,
    leadingIcon = undefined as string | undefined,
    type = "text" as "text" | "search" | "email" | "password",
    class: className = "",
    onkeydown = undefined as ((e: KeyboardEvent) => void) | undefined,
    ...restProps
  }: {
    ref?: HTMLInputElement | null;
    value?: string;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    leadingIcon?: string;
    type?: "text" | "search" | "email" | "password";
    class?: string;
    onkeydown?: (e: KeyboardEvent) => void;
  } = $props();
</script>

{#if label}
  <label for={label} class="block text-xs font-semibold text-discord-text-muted uppercase tracking-wide mb-2">
    {label}
  </label>
{/if}
<div
  class="flex items-center bg-discord-darkest border border-discord-divider rounded-md px-3 py-2 focus-within:border-discord-blurple transition-colors {className}"
>
  {#if leadingIcon}
    <span class="text-discord-text-muted text-lg mr-1">{leadingIcon}</span>
  {/if}
  <input
    bind:this={ref}
    {type}
    {placeholder}
    {disabled}
    bind:value
    {onkeydown}
    id={label || undefined}
    class="flex-1 bg-transparent text-discord-text placeholder-discord-text-dim border-none outline-none text-sm"
  />
</div>