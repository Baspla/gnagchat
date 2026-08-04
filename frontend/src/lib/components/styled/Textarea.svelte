<script lang="ts">
  let {
    ref = $bindable(null),
    value = $bindable(""),
    placeholder = "",
    disabled = false,
    rows = 1,
    class: className = "",
    onkeydown = undefined as ((e: KeyboardEvent) => void) | undefined,
    ...restProps
  }: {
    ref?: HTMLTextAreaElement | null;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    class?: string;
    onkeydown?: (e: KeyboardEvent) => void;
  } = $props();
</script>

<textarea
  bind:this={ref}
  {placeholder}
  {disabled}
  {rows}
  bind:value
  {onkeydown}
  class="flex-1 bg-transparent text-discord-text placeholder-discord-text-muted resize-none border-none outline-none focus:outline-none focus:ring-0 text-sm leading-[1.375rem] max-h-[144px] {className}"
  {...restProps}
></textarea>