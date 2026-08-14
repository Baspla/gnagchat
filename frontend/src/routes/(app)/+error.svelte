<script lang="ts">
	import { page } from "$app/state";
	import Applayout from "$lib/components/layout/AppLayout.svelte";
</script>

<Applayout>
	<h1 class="text-9xl font-bold">{page.status}</h1>
	<h2 class="text-4xl">{page.error?.message}</h2>
</Applayout>
