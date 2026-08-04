<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { subscribeToChannel, disconnectCentrifuge } from '$lib/centrifugo.svelte';
	import { api } from '$lib/api';
	import type { Subscription } from 'centrifuge';

	interface Channel {
		roomId: string;
		name: string;
	}

	let channels: Channel[] = $state([]);
	let selectedRoomId: string = $state('');
	let newChannelName: string = $state('');
	let loading = $state(false);
	let channelsError = $state('');

	let messages: Array<{ userId: string; content: string; createdAt: string }> = $state([]);
	let inputValue: string = $state('');

	let subscription: Subscription | null = null;

	async function loadChannels() {
		loading = true;
		channelsError = '';
		try {
			const { data, error } = await api.chat.channels.get();
			if (error) {
				channelsError = 'Failed to load channels.';
				console.error('Failed to load channels:', error.value);
				return;
			}
			channels = (data ?? []).map((ch) => ({ roomId: ch.roomId, name: ch.name }));

			// If no room selected yet and channels exist, select the first one
			if (!selectedRoomId && channels.length > 0) {
				selectChannel(channels[0].roomId);
			}
			// If previously selected room no longer exists, select the first one
			else if (selectedRoomId && !channels.some((c) => c.roomId === selectedRoomId)) {
				selectChannel(channels[0]?.roomId ?? '');
			}
		} catch (err) {
			console.error('Failed to load channels:', err);
			channelsError = 'Failed to load channels.';
		} finally {
			loading = false;
		}
	}

	function selectChannel(roomId: string) {
		selectedRoomId = roomId;
		messages = [];
	}

	async function createChannel() {
		const name = newChannelName.trim();
		if (!name) return;

		try {
			const { data, error } = await api.chat.channels.post({ name });
			if (error) {
				console.error('Failed to create channel:', error.value);
				return;
			}
			if (data) {
				const newChannel: Channel = {
					roomId: data.roomId,
					name: data.name,
				};
				channels = [newChannel, ...channels];
				selectChannel(newChannel.roomId);
				newChannelName = '';
			}
		} catch (err) {
			console.error('Failed to create channel:', err);
		}
	}

	function connect() {
		if (!selectedRoomId) return;

		const sub = subscribeToChannel(`room:${selectedRoomId}`);

		sub.on('publication', (ctx) => {
			const data = ctx.data as { userId?: string; content?: string; createdAt?: string };
			messages = [...messages, {
				userId: data.userId ?? 'unknown',
				content: data.content ?? '',
				createdAt: data.createdAt ?? new Date().toISOString(),
			}];
		});

		return sub;
	}

	$effect(() => {
		// Re-connect whenever selectedRoomId changes
		const sub = connect();
		subscription = sub ?? null;

		return () => {
			if (sub) {
				sub.unsubscribe();
			}
			subscription = null;
		};
	});

	onMount(() => {
		loadChannels();
	});

	onDestroy(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
		disconnectCentrifuge();
	});

	async function sendMessage() {
		const content = inputValue.trim();
		if (!content || !selectedRoomId) return;

		try {
			await api.chat.rooms({ roomId: selectedRoomId }).messages.post({ content });
			inputValue = '';
		} catch (err) {
			console.error('Failed to send message:', err);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			sendMessage();
		}
	}

	function handleCreateKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			createChannel();
		}
	}
</script>

<div>
	<h3>Chat</h3>

	<div>
		<h4>Channels</h4>

		{#if loading}
			<p>Loading channels…</p>
		{:else if channelsError}
			<p class="error">{channelsError}</p>
		{:else if channels.length === 0}
			<p>No channels available. Create one below.</p>
		{:else}
			<ul>
				{#each channels as ch}
					<li>
						<button
							class="channel-button"
							class:selected={ch.roomId === selectedRoomId}
							onclick={() => selectChannel(ch.roomId)}
						>
							{ch.name}
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<div>
			<input
				type="text"
				bind:value={newChannelName}
				onkeydown={handleCreateKeydown}
				placeholder="New channel name…"
			/>
			<button onclick={createChannel}>Create</button>
		</div>
	</div>

	<div>
		<h4>Messages — {selectedRoomId ? 'Room: ' + selectedRoomId : 'No channel selected'}</h4>

		<ul>
			{#each messages as msg}
				<li>
					<strong>{msg.userId}</strong>: {msg.content}
					<em>{new Date(msg.createdAt).toLocaleTimeString()}</em>
				</li>
			{/each}
		</ul>

		<div>
			<input
				type="text"
				bind:value={inputValue}
				onkeydown={handleKeydown}
				placeholder="Type a message…"
				disabled={!selectedRoomId}
			/>
			<button onclick={sendMessage} disabled={!selectedRoomId}>Send</button>
		</div>
	</div>
</div>

<style>
	.channel-button.selected {
		font-weight: bold;
		background-color: #ddd;
	}

	.error {
		color: red;
	}
</style>