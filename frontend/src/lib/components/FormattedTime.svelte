<script lang="ts">
  import Time, { dayjs } from 'svelte-time';
    import "dayjs/locale/de";
  import isToday from 'dayjs/plugin/isToday';
  import isYesterday from 'dayjs/plugin/isYesterday';

  dayjs.extend(isToday);
  dayjs.extend(isYesterday);

  let { timestamp, ...rest } = $props();

  let dynamicFormat = $derived(
    dayjs(timestamp).isToday() ? 'HH:mm' :
    dayjs(timestamp).isYesterday() ? '[gestern um] HH:mm' :
    'DD.MM.YYYY HH:mm'
  );
</script>

<Time {timestamp} format={dynamicFormat} {...rest} locale="de"/>