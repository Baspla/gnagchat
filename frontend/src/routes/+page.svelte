<script lang="ts">
  import { authClient } from "$lib/auth-client";
  import ChatBox from "$lib/components/ChatBox.svelte";
  import CreateChannelModal from "$lib/components/CreateChannelModal.svelte";
  import { Button } from "$lib/components/styled/index";
  import { api } from "$lib/api";
  import type { PageData } from "./$types";
  import { env } from "$env/dynamic/public";
  import { onMount } from "svelte";

  let { data }: { data: PageData } = $props();

  const session = authClient.useSession();
  const user = $derived($session.data?.user ?? data.user ?? null);

  // Channel state
  let channels = $state<{ roomId: string; name: string; createdAt: Date }[]>([]);
  let selectedRoomId = $state<string | null>(null);
  let selectedChannelName = $state<string>("");
  let showCreateModal = $state(false);

  onMount(() => {
    loadChannels();
  });

  async function loadChannels() {
    try {
      const response = await api.chat.channels.get();
      if (response.data) {
        channels = response.data as { roomId: string; name: string; createdAt: Date }[];
        // Auto-select first channel if none selected
        if (channels.length > 0 && !selectedRoomId) {
          selectedRoomId = channels[0].roomId;
          selectedChannelName = channels[0].name;
        }
      }
    } catch (e) {
      console.error("Failed to load channels:", e);
    }
  }

  function selectChannel(roomId: string, name: string) {
    selectedRoomId = roomId;
    selectedChannelName = name;
  }

  function handleCreateModalClose() {
    showCreateModal = false;
    loadChannels();
  }

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
  <!-- Discord-style 2-panel layout (no server bar) -->
  <div class="flex h-screen w-screen overflow-hidden">
    <!-- Channel sidebar -->
    <div class="flex flex-col w-sidebar bg-discord-dark shrink-0">
      <!-- Server name header -->
      <div class="h-header flex items-center px-4 border-b border-discord-border shadow-sm cursor-pointer hover:bg-discord-hover transition-colors">
        <h1 class="text-base font-semibold text-discord-text">GnagChat</h1>
      </div>

      <!-- Channel list -->
      <div class="flex-1 overflow-y-auto px-2 pt-3">
        <div class="flex items-center justify-between px-2 mb-1">
          <span class="text-xs font-semibold text-discord-text-muted tracking-wide uppercase">Channels</span>
          <button
            onclick={() => (showCreateModal = true)}
            class="w-5 h-5 flex items-center justify-center rounded hover:bg-discord-hover text-discord-text-muted hover:text-discord-text transition-colors"
            title="Create Channel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        {#each channels as ch (ch.roomId)}
          <button
            onclick={() => selectChannel(ch.roomId, ch.name)}
            class="flex items-center gap-1.5 w-full px-2 py-1 rounded text-left transition-colors {ch.roomId === selectedRoomId ? 'bg-discord-active text-discord-text' : 'text-discord-text-muted hover:bg-discord-hover hover:text-discord-text'}"
          >
            <span class="text-lg">#</span>
            <span class="text-base font-medium truncate">{ch.name}</span>
          </button>
        {/each}
        {#if channels.length === 0}
          <div class="px-2 py-4 text-center text-xs text-discord-text-dim">
            No channels yet. Create one!
          </div>
        {/if}
      </div>

      <!-- User area at bottom of sidebar -->
      <div class="h-[52px] flex items-center px-2 bg-discord-darkest shrink-0">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          {#if user.image}
            <div class="relative">
              <img src={user.image} alt="" class="w-8 h-8 rounded-full" />
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-darkest"></span>
            </div>
          {:else}
            <div class="relative">
              <div class="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-medium">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-discord-green rounded-full border-2 border-discord-darkest"></span>
            </div>
          {/if}
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-medium text-discord-text truncate">{user.name}</span>
            <span class="text-xs text-discord-text-muted">Online</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onclick={() => logout()} title="Sign out">
          {#snippet children()}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          {/snippet}
        </Button>
      </div>
    </div>

    <!-- Main chat area -->
    <div class="flex-1 flex flex-col bg-discord-medium min-w-0">
      {#if selectedRoomId}
        <ChatBox roomId={selectedRoomId} channelName={selectedChannelName} />
      {:else}
        <div class="flex items-center justify-center h-full text-discord-text-muted text-sm">
          Select or create a channel to start chatting
        </div>
      {/if}
    </div>
  </div>

  <!-- Create Channel Modal -->
  <CreateChannelModal
    show={showCreateModal}
    onClose={handleCreateModalClose}
  />
{:else}
  <!-- Login screen (Discord-inspired) -->
  <div class="h-screen w-screen flex items-center justify-center bg-discord-medium">
    <div class="bg-discord-darkest rounded-lg p-8 w-full max-w-md mx-4 shadow-2xl">
      <div class="flex flex-col items-center gap-6">
        <div class="w-16 h-16 rounded-2xl bg-discord-blurple flex items-center justify-center text-white font-bold text-3xl shadow-lg">
          G
        </div>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-discord-text mb-1">Welcome back!</h1>
          <p class="text-sm text-discord-text-muted">Sign in to start chatting</p>
        </div>
        <Button variant="primary" class="w-full py-3 text-base" onclick={login}>Sign in with GnagPlus</Button>
        <p class="text-xs text-discord-text-dim">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  </div>
{/if}