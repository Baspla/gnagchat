<script lang="ts">
    import { ChatMessages } from '$lib/chat/messages.svelte';
    import { appWebSocket } from '$lib/chat/appWebsocket.svelte';
    import { userCache, type UserInfo } from '$lib/chat/userCache.svelte';
    import { Textarea, Button } from '$lib/components/styled/index';
    import { onMount } from 'svelte';

    let { roomId = 'default-room', channelName = 'general' }: { roomId?: string; channelName?: string } = $props();

    let chat = $state(new ChatMessages(roomId));
    let messageInput = $state('');
    let messagesContainer: HTMLDivElement | undefined = $state();

    function scrollToBottom() {
        if (messagesContainer) {
            requestAnimationFrame(() => {
                messagesContainer!.scrollTop = messagesContainer!.scrollHeight;
            });
        }
    }

    function initChat(newRoomId: string) {
        chat.disconnect();
        chat = new ChatMessages(newRoomId);
        chat.onNewMessage = () => scrollToBottom();
        chat.connect().then(() => {
            scrollToBottom();
        });
    }

    onMount(() => {
        chat.onNewMessage = () => scrollToBottom();

        chat.connect().then(() => {
            scrollToBottom();
        });

        return () => {
            chat.disconnect();
            chat.onNewMessage = null;
        };
    });

    // Reactively re-initialize chat when roomId changes
    $effect(() => {
        if (roomId && chat.roomId !== roomId) {
            initChat(roomId);
        }
    });

    async function handleSend() {
        const content = messageInput.trim();
        if (!content) return;

        const success = await chat.sendMessage(content);
        if (success) {
            messageInput = '';
            scrollToBottom();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    let userInfos = $state<Map<string, UserInfo | null>>(new Map());

    async function loadUserInfo(userId: string) {
        if (userInfos.has(userId)) return;
        const info = await userCache.getUser(userId);
        userInfos.set(userId, info);
        userInfos = new Map(userInfos);
    }

    function getUserInfo(userId: string): UserInfo | null | undefined {
        return userInfos.get(userId);
    }

    function formatTime(date: Date): string {
        try {
            return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    }

    function formatDate(date: Date): string {
        try {
            const d = new Date(date);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (d.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (d.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            } else {
                return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            }
        } catch {
            return '';
        }
    }

    // Track message grouping - show avatar only on first message of consecutive same-user messages
    let lastUserId: string | null = $state(null);

    function shouldShowHeader(msg: any, index: number): boolean {
        if (index === 0) return true;
        const prev = chat.messages[index - 1];
        if (!prev) return true;
        // Show header if different user or time gap > 5 minutes
        if (prev.userId !== msg.userId) return true;
        const timeDiff = new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime();
        if (timeDiff > 5 * 60 * 1000) return true;
        return false;
    }
</script>

<div class="flex flex-col h-full">
    <!-- Chat header (Discord channel header) -->
    <div class="h-header flex items-center px-4 border-b border-discord-border shrink-0">
        <div class="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-discord-text-muted">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="text-base font-semibold text-discord-text">{channelName}</span>
            <span class="w-2 h-2 rounded-full ml-2 {appWebSocket.connectionState === 'connected' ? 'bg-discord-green' : 'bg-discord-red'}"></span>
        </div>
    </div>

    <!-- Messages area (Discord-style) -->
    <div
        bind:this={messagesContainer}
        class="flex-1 overflow-y-auto px-4 py-2"
    >
        {#if chat.loading}
            <div class="flex items-center justify-center h-full">
                <div class="flex flex-col items-center gap-3">
                    <div class="w-10 h-10 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin"></div>
                    <p class="text-discord-text-muted text-sm">Loading messages...</p>
                </div>
            </div>
        {:else if chat.error && chat.messages.length === 0}
            <div class="flex items-center justify-center h-full">
                <p class="text-discord-red text-sm">Error: {chat.error}</p>
            </div>
        {:else if chat.messages.length === 0}
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <div class="w-16 h-16 rounded-full bg-discord-dark flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-discord-text-dim">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </div>
                    <p class="text-discord-text-muted text-base font-medium">No messages yet</p>
                    <p class="text-discord-text-dim text-sm mt-1">Start the conversation!</p>
                </div>
            </div>
        {:else}
            {#each chat.messages as msg, i (msg.id)}
                {#await loadUserInfo(msg.userId) then}
                    {#if shouldShowHeader(msg, i)}
                        <!-- Date separator -->
                        {#if i === 0 || new Date(msg.createdAt).toDateString() !== new Date(chat.messages[i - 1]?.createdAt).toDateString()}
                            <div class="flex items-center gap-2 my-4">
                                <div class="flex-1 h-px bg-discord-divider"></div>
                                <span class="text-xs font-medium text-discord-text-muted px-2">{formatDate(msg.createdAt)}</span>
                                <div class="flex-1 h-px bg-discord-divider"></div>
                            </div>
                        {/if}

                        <!-- Message with full header (avatar + name + timestamp) -->
                        <div class="flex gap-4 px-4 py-0.5 hover:bg-discord-hover rounded-sm group">
                            <div class="w-10 h-10 rounded-full mt-0.5 shrink-0 overflow-hidden bg-discord-blurple">
                                {#if getUserInfo(msg.userId)?.image}
                                    <img src={getUserInfo(msg.userId)!.image!} alt="" class="w-full h-full object-cover" />
                                {:else}
                                    <div class="w-full h-full flex items-center justify-center text-white text-sm font-medium">
                                        {getUserInfo(msg.userId)?.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                {/if}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-baseline gap-2">
                                    <span class="text-sm font-medium text-discord-text hover:underline cursor-pointer">
                                        {getUserInfo(msg.userId)?.name || msg.userId.slice(0, 8)}
                                    </span>
                                    <span class="text-xs text-discord-text-muted">{formatTime(msg.createdAt)}</span>
                                </div>
                                <p class="text-sm text-discord-text mt-0.5 leading-[1.375rem]">{msg.content}</p>
                            </div>
                        </div>
                    {:else}
                        <!-- Compact message (same user, no avatar) -->
                        <div class="flex gap-4 px-4 py-0.5 hover:bg-discord-hover rounded-sm group">
                            <div class="w-10 shrink-0"></div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-discord-text leading-[1.375rem]">{msg.content}</p>
                            </div>
                        </div>
                    {/if}
                {/await}
            {/each}
        {/if}
    </div>

    <!-- Error banner -->
    {#if chat.error}
        <div class="mx-4 mb-2 px-4 py-2 bg-discord-red bg-opacity-10 border border-discord-red border-opacity-30 rounded-md">
            <p class="text-sm text-discord-red">{chat.error}</p>
        </div>
    {/if}

    <!-- Input area (Discord-style) -->
    <div class="px-4 pb-6 pt-2 shrink-0">
        <div class="flex items-center bg-discord-input-bg rounded-md px-4 py-2.5 focus-within:ring-1 focus-within:ring-discord-blurple transition-colors">
            <Textarea
                bind:value={messageInput}
                onkeydown={handleKeydown}
                placeholder="Message #{channelName}"
                rows={1}
                disabled={chat.sending}
            />
            <div class="flex items-center gap-1 ml-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onclick={handleSend}
                    disabled={chat.sending || !messageInput.trim()}
                >
                    {#snippet children()}
                        {#if chat.sending}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            </svg>
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        {/if}
                    {/snippet}
                </Button>
            </div>
        </div>
    </div>
</div>