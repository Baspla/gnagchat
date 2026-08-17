<script lang="ts">
    let {
        timestamp,
    }: {
        timestamp: Date;
    } = $props();

    function formatDay(timestamp: Date) {
        return new Intl.DateTimeFormat("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(timestamp);
    }
</script>

<div class="flex items-center gap-3 py-2" role="separator">
    <div class="h-px flex-1 bg-surface-800-200/50"></div>
    <span class="text-sm text-surface-800-200 capitalize">
        {formatDay(timestamp)}
    </span>
    <div class="h-px flex-1 bg-surface-800-200/50"></div>
</div>
