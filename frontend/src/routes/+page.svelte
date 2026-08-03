<script lang="ts">
  import { api } from "$lib/api";
  import { authClient } from "$lib/auth-client";
  import type { PageData } from "./$types";
  import { env } from "$env/dynamic/public";

  let { data }: { data: PageData } = $props();

  const session = authClient.useSession();
  const user = $derived($session.data?.user ?? data.user ?? null);

  async function login() {
    console.log("Logging in with provider:", env.PUBLIC_VITE_OAUTH_PROVIDER_ID || "gnagplus");
    await authClient.signIn.social({
      provider: env.PUBLIC_VITE_OAUTH_PROVIDER_ID || "gnagplus",
      callbackURL: "/",
    });
  }
  async function logout() {
    await authClient.signOut();
    // redirect to home page after logout to clear any protected routes
    window.location.href = "/";
  }
</script>

<h1>Login</h1>

<p>Environment: {env.PUBLIC_ENV_FILE_IDENTIFIER}</p>

{#if user}
  <p>You are logged in.</p>
  <p><strong>Name:</strong> {user.name}</p>
  <p><strong>Email:</strong> {user.email}</p>
  {#if user.image}
    <img src={user.image} alt="Profile" width="64" height="64" />
  {/if}
  <button onclick={logout}>Sign out</button>
  {#await api.status.get()}
    <p>Checking status...</p>
  {:then response}
    <p>API Status: {response.data?.status}</p>
  {:catch error}
    <p>Error checking status: {error.message}</p>
  {/await}
{:else}
  <button onclick={login}>Sign in</button>
{/if}
