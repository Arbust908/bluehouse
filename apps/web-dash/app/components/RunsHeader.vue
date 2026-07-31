<template>
  <dl class="grid border-y border-zinc-300 dark:border-slate-700 sm:grid-cols-2">
    <RunSummaryItem v-for="(item, index) in runSummaryItems" :key="item.label" :item="item" :divided="index === 0" />
  </dl>
</template>

<script setup lang="ts">
import type { PollRun } from '@bluehouse/shared/db/schema';
import { useTimeAgoIntl } from '@vueuse/core';

interface RunsHeaderProps {
  runs: PollRun[];
}

const props = defineProps<RunsHeaderProps>()

const runSummary = computed(() => {
  let lastSuccessful: PollRun | undefined
  let lastInserted: PollRun | undefined

  for (const run of props.runs) {
    if (run.status !== 'success' || !run.completedAt) continue

    const completedAt = new Date(String(run.completedAt)).getTime()
    if (!lastSuccessful || completedAt > new Date(String(lastSuccessful.completedAt)).getTime()) {
      lastSuccessful = run
    }
    if ((run.rowsInserted ?? 0) > 0
      && (!lastInserted || completedAt > new Date(String(lastInserted.completedAt)).getTime())) {
      lastInserted = run
    }
  }

  return { lastInserted, lastSuccessful }
})

const lastInsertedAgo = useTimeAgoIntl(
  () => runSummary.value.lastInserted?.completedAt ?? Date.now(),
  { locale: 'es-AR' },
)
const lastSuccessfulAgo = useTimeAgoIntl(
  () => runSummary.value.lastSuccessful?.completedAt ?? Date.now(),
  { locale: 'es-AR' },
)

const runSummaryItems = computed(() => [
  {
    label: 'Datos actualizados',
    value: runSummary.value.lastInserted ? lastInsertedAgo.value : 'Sin registros',
    detail: runSummary.value.lastInserted
      ? `· ${runSummary.value.lastInserted.rowsInserted} tasas nuevas`
      : '',
    available: Boolean(runSummary.value.lastInserted),
  },
  {
    label: 'Último control',
    value: runSummary.value.lastSuccessful ? lastSuccessfulAgo.value : 'Sin registros',
    detail: runSummary.value.lastSuccessful?.rowsInserted
      ? `· ${runSummary.value.lastSuccessful.rowsInserted} tasas nuevas`
      : '· sin cambios',
    available: Boolean(runSummary.value.lastSuccessful),
  },
])
</script>
