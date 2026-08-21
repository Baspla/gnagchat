<script lang="ts">
	import { Switch } from '@skeletonlabs/skeleton-svelte';

	let checked = $state(false);

	$effect(() => {
		const mode = localStorage.getItem('mode') || 'light';
		checked = mode === 'dark';
	});

	const applyMode = (mode: 'dark' | 'light') => {
		document.documentElement.setAttribute('data-mode', mode);
		localStorage.setItem('mode', mode);
	};

	const onCheckedChange = (event: { checked: boolean }) => {
		const mode = event.checked ? 'dark' : 'light';
		checked = event.checked;

		// Reveal the new theme through the shigure-ui-smol.gif mask via the View Transitions API
		if (document.startViewTransition) {
			document.startViewTransition(() => applyMode(mode));
		} else {
			applyMode(mode);
		}
	};
</script>

<svelte:head>
	<script>
		document.documentElement.setAttribute('data-mode', localStorage.getItem('mode') || 'dark');
	</script>
</svelte:head>

<Switch {checked} {onCheckedChange}>
	<Switch.Control>
		<Switch.Thumb />
	</Switch.Control>
	<Switch.HiddenInput />
</Switch>