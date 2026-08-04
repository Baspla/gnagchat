<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";

  let {
    open = $bindable(false),
    onOpenChange = undefined as ((open: boolean) => void) | undefined,
    title = "",
    description = "",
    children,
    footer,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string;
    children?: import("svelte").Snippet;
    footer?: import("svelte").Snippet;
  } = $props();

  function handleOpenChange(v: boolean) {
    open = v;
    onOpenChange?.(v);
  }
</script>

<BitsDialog.Root bind:open={open} onOpenChange={handleOpenChange}>
  <BitsDialog.Portal>
    <BitsDialog.Overlay
      class="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <BitsDialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-discord-darkest rounded-lg shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
    >
      {#if title}
        <div class="flex items-center justify-between px-4 h-12 border-b border-discord-divider">
          <BitsDialog.Title class="text-base font-semibold text-discord-text">{title}</BitsDialog.Title>
          <BitsDialog.Close class="w-8 h-8 flex items-center justify-center rounded hover:bg-discord-hover text-discord-text-muted hover:text-discord-text transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </BitsDialog.Close>
        </div>
      {/if}

      {#if description}
        <BitsDialog.Description class="sr-only">{description}</BitsDialog.Description>
      {/if}

      <div class="p-4">
        {@render children?.()}
      </div>

      {#if footer}
        <div class="flex items-center justify-end gap-3 px-4 h-14 bg-discord-dark rounded-b-lg">
          {@render footer()}
        </div>
      {/if}
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>