<script lang="ts">
	import { onDestroy } from 'svelte';
	import { subscribeToChannel } from '$lib/centrifugo.svelte';
	import { api } from '$lib/api';
	import type { Subscription } from 'centrifuge';

	interface Props {
		roomId: string;
	}

	let { roomId }: Props = $props();

	let messages: Array<{ userId: string; content: string; createdAt: string }> = $state([]);
	let inputValue: string = $state('');

	let subscription: Subscription | null = null;

	function connect() {
		if (subscription) {
			subscription.unsubscribe();
		}

		subscription = subscribeToChannel(`room:${roomId}`);

		subscription.on('publication', (ctx) => {
			const data = ctx.data as { userId?: string; content?: string; createdAt?: string };
			messages = [...messages, {
				userId: data.userId ?? 'unknown',
				content: data.content ?? '',
				createdAt: data.createdAt ?? new Date().toISOString(),
			}];
		});
	}

	$effect(() => {
		// Re-connect whenever roomId changes
		connect();
	});

	onDestroy(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
	});

	async function sendMessage() {
		const content = inputValue.trim();
		if (!content) return;

		try {
		await api.chat.rooms({ roomId }).messages.post({ content });
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
</script>

<div>
	<h3>Chat — Room: {roomId}</h3>

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
		/>
		<button onclick={sendMessage}>Send</button>
	</div>
</div>