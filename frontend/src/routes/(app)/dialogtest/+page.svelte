<script lang="ts">
    import CustomDialog from "$lib/components/customdialog/CustomDialog.svelte";
    import AlertDialog from "$lib/components/customdialog/AlertDialog.svelte";
    import AppLayout from "$lib/components/layout/AppLayout.svelte";
    import { toaster } from "$lib/toaster";

    let dialogOpen = $state(false);
    let alertDialogOpen = $state(false);

    function handleAction() {
        toaster.success({
            title: "Action executed",
            description: "The action has been successfully executed.",
        });
        alertDialogOpen = false;
    }
</script>

<AppLayout>
    <button class="btn btn-primary" onclick={() => dialogOpen = true}>
        Test
    </button>
    <CustomDialog bind:open={dialogOpen} contentProps={{ class: "p-4" }}>
        {#snippet title()}
            <p>Title</p>
        {/snippet}
        {#snippet description()}
            <p>Description</p>
        {/snippet}
        <p>This is the content of the dialog.</p>
    </CustomDialog>
    <button class="btn btn-primary" onclick={() => alertDialogOpen = true}>
        Test Alert
    </button>
    <AlertDialog bind:open={alertDialogOpen} contentProps={{ class: "p-4", interactOutsideBehavior: "close" }} onAction={() => handleAction()}>
        {#snippet title()}
            <p>Title</p>
        {/snippet}
        {#snippet description()}
            <p>Description</p>
        {/snippet}
        <textarea
            placeholder="Channel Name"
            class="w-full rounded p-2 input resize-none"
            rows="1"
        ></textarea>
    </AlertDialog>
</AppLayout>
