<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import type { WsMessage } from "$shared/dto/ws-message";
    import { getGatewayManager } from "$lib/gateway/gateway-context.svelte";
    import { api } from "$lib/api";

    const gatewayManager = getGatewayManager();

    let publications = $state(new SvelteMap<string, WsMessage>());

    let unsubscribes: (() => void)[] = [];

    onMount(() => {
        unsubscribes.push(
            gatewayManager.onAny((_data, msg) => {
                publications.set(msg.id, msg);
                publications = new SvelteMap(publications);
            }),
        );
    });

    onDestroy(() => {
        for (const unsubscribe of unsubscribes) {
            unsubscribe();
        }
    });

    function callTest() {
        api.gateway.test.get();
    }

    function renderMessage(msg: WsMessage): string {
        return JSON.stringify(msg);
    }
</script>

<div class="flex flex-col w-full p-3">
    <h2 class="text-lg font-bold mb-2">Centrifugo Logger</h2>
    <div class="flex-1 overflow-y-auto border p-2 rounded w-full">
        {#each Array.from(publications) as publication, index (publication[0])}
            <div
                class="mb-1 p-1 rounded {index % 2 === 0
                    ? 'bg-gray-100'
                    : 'bg-gray-200'}"
            >
                {renderMessage(publication[1])}
            </div>
        {/each}
    </div>
    <button class="mt-2 p-2 bg-blue-500 text-white rounded" onclick={callTest}>
        Call Test API
    </button>
</div>
