<template>
  <div class="stats shadow">
    <StatBox v-for="statusEntry in runsPerStatus" :key="statusEntry.title" :title="statusEntry.title"
      :value="statusEntry.value" :description="statusEntry.description" />
  </div>
</template>

<script setup lang="ts">
import type { PollRun, PollStatus } from '@bluehouse/shared/db/schema';

interface RunsHeaderProps {
  runs: PollRun[];
}
interface RunStatus {
  title: PollStatus;
  value: number;
  description: string;
}

const props = defineProps<RunsHeaderProps>()

const pollRuns = toRef(props.runs)
const runsPerStatus = computed(() => {
  const statusCounts: RunStatus[] = [
    { title: 'success', value: 0, description: '' },
    { title: 'failed', value: 0, description: '' },
    { title: 'skipped', value: 0, description: '' },
  ]
  pollRuns.value.forEach((run) => {
    const status = run.status
    const statusEntry = statusCounts.find(entry => entry.title === status)
    if (!statusEntry) {
      console.warn(`Unknown status: ${status}`)
      return
    }
    statusEntry.value += 1
    const lastRunByDate = pollRuns.value.reduce((latest, current) => {
      return new Date(current.completedAt) > new Date(latest.completedAt) ? current : latest
    }, pollRuns.value[0])
    statusEntry.description = `Last run: ${new Date(lastRunByDate.completedAt).toLocaleString()}`
  })
  return statusCounts
})
</script>