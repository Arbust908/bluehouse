<template>
  <main class="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
    <p class="text-xs font-semibold uppercase tracking-widest text-indigo-800 dark:text-indigo-200">BlueHouse API</p>
    <h1 class="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight">Exchange-rate data, without
      guesswork.</h1>
    <p class="mt-4 max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-slate-300">Reference for
      BlueHouse endpoints and the Ámbito historical sources used by the poller. Every endpoint page includes its current
      contract, an executable request, and examples for common clients.</p>

    <div class="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
      <DocsOverviewGroup v-for="group in groups" :key="group.name" :group="group" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { endpointDocs } from '~/data/apiDocs'

definePageMeta({ layout: 'docs' })
useHead({ title: 'API documentation | BlueHouse' })

const groups = [
  { name: 'BlueHouse API', slug: 'api', description: 'Public and internal routes served by this application.', items: endpointDocs.filter(item => item.group === 'BlueHouse API') },
  { name: 'Ámbito reference', slug: 'ambito', description: 'Historical upstream routes, mapped to BlueHouse house names.', items: endpointDocs.filter(item => item.group === 'Ámbito reference') },
]
</script>
