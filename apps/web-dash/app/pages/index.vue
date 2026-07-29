<template>
  <main class="h-full p-4">
    <h2>Corridas</h2>
    <Suspense>
      <template #default>
        <RunsHeader :runs="runs" />
      </template>
      <template #fallback>
        <p>Loading...</p>
      </template>
    </Suspense>
    <h2>Precisos</h2>
    <Suspense>
      <template #default>
        <div>
          <RateCards :rates="rates" />
        </div>
      </template>
      <template #fallback>
        <p>Loading...</p>
      </template>
    </Suspense>
  </main>
</template>

<script setup lang="ts">
const { data, error } = await useAsyncData('fullData', () => $fetch('/api'))
const runs = computed(() => data.value?.pollRuns || [])
const rates = computed(() => data.value?.rateObservations || [])
</script>