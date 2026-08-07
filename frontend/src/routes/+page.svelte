<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import type { PageData } from "./$types";
  import { env } from "$env/dynamic/public";
  import { onMount } from "svelte";
  import { connectToGateway } from "$lib/sse";
  import ChatContainer from "$lib/components/chat/ChatContainer.svelte";
    import { setPageTitle } from "$lib/utils";

  let { data }: { data: PageData } = $props();

  const session = authClient.useSession();
  const user = $derived($session.data?.user ?? data.user ?? null);

  onMount(() => {
	setPageTitle();
    if (user) {
      connectToGateway();
    }
  });

  async function login() {
    console.log("Logging in with provider:", env.PUBLIC_VITE_OAUTH_PROVIDER_ID || "gnagplus");
    await authClient.signIn.social({
      provider: env.PUBLIC_VITE_OAUTH_PROVIDER_ID || "gnagplus",
      callbackURL: "/",
    });
  }

  async function logout() {
    await authClient.signOut();
    window.location.href = "/";
  }
</script>

{#if user}
  <ChatContainer userName={user.name} onLogout={logout} />
{:else}
  <div class="h-screen w-screen flex items-center justify-center">
    <div class="rounded-lg p-8 w-full max-w-md mx-4 shadow-2xl">
      <div class="flex flex-col items-center gap-6">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-black font-bold text-3xl shadow-lg">
          G
        </div>
        <div class="text-center">
          <h1 class="text-2xl font-bold mb-1">Hallo!</h1>
          <button onclick={login} class="bg-emerald-400 text-white px-4 py-2 rounded-lg shadow-lg">
            Login mit {env.PUBLIC_VITE_OAUTH_PROVIDER_ID || "Gnagplus"}</button>
        </div>
      </div>
    </div>
  </div>
{/if}