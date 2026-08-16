<script lang="ts">
	import { toaster } from '$lib/toaster';
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<Toast.Group {toaster}>
	{#snippet children(toast)}
		<Toast toast={toast}>
			<Toast.Message>
			<Toast.Title>{toast.title}</Toast.Title>
			<Toast.Description>{toast.description}</Toast.Description>
			</Toast.Message>
			<Toast.CloseTrigger />
		</Toast>
	{/snippet}
</Toast.Group>