<template>
  <dl class="grid border-y border-[var(--color-rule)] sm:grid-cols-2">
    <div v-for="(item, index) in runSummaryItems" :key="item.label"
      class="flex items-center justify-between gap-5 py-3.5 sm:px-5"
      :class="index === 0 ? 'border-b border-[var(--color-rule)] sm:border-r sm:border-b-0 sm:pl-0' : 'sm:pr-0'">
      <dt class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        <span class="size-1.5 rounded-full" :class="item.available ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-muted)]'" />
        {{ item.label }}
      </dt>
      <dd class="numeric text-right text-sm font-semibold text-[var(--color-ink)]">
        {{ item.value }}
        <span class="ml-1 hidden font-normal text-[var(--color-muted)] lg:inline">{{ item.detail }}</span>
      </dd>
    </div>
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
