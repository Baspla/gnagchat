<script lang="ts">
  import { browser } from "$app/environment";
  import { authClient } from "$lib/auth-client";
  import type { LayoutData } from "./$types";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  const session = authClient.useSession();
  const user = $derived($session.data?.user ?? data.user ?? null);

  async function logout() {
    await authClient.signOut();
    window.location.href = "/login";
  }
</script>

{#if user}
  <div class="flex h-screen">
    <aside class="flex flex-col w-64 border-r p-4">
      <div class="pt-4">
        <p class="mb-2">{user.name}</p>
        <button onclick={logout} class="text-red-500">Logout</button>
      </div>
    </aside>

    <main class="flex flex-col flex-1 min-w-0">
      {@render children()}
    </main>
  </div>
{:else}
  <div class="h-screen">
    {@render children()}
  </div>
{/if}