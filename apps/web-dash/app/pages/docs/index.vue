<template>
  <main class="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
    <p class="text-xs font-[650] uppercase tracking-[0.08em] text-indigo-800 dark:text-indigo-200">BlueHouse API</p>
    <h1 class="mt-3 max-w-2xl text-[2rem] font-[650] leading-[1.1] tracking-[-0.035em]">Exchange-rate data, without
      guesswork.</h1>
    <p class="mt-4 max-w-[70ch] text-[0.9375rem] leading-[1.55] text-zinc-600 dark:text-slate-300">Reference for
      BlueHouse endpoints and the Ámbito historical sources used by the poller. Every endpoint page includes its current
      contract, an executable request, and examples for common clients.</p>

    <div class="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
      <section v-for="group in groups" :key="group.name" :aria-labelledby="`${group.slug}-title`">
        <div class=" pb-3">
          <h2 :id="`${group.slug}-title`" class="text-base font-[650] leading-[1.3]">{{ group.name }}</h2>
          <p class="mt-1 text-sm text-zinc-600 dark:text-slate-300">{{ group.description }}</p>
        </div>
        <ul class="divide-y divide-zinc-300 dark:divide-slate-700">
          <li v-for="endpoint in group.items" :key="endpoint.slug">
            <NuxtLink :to="`/docs/${endpoint.slug}`"
              class="group -mx-2 flex min-h-12 items-center gap-3 rounded-md px-2 transition duration-150 ease-out hover:scale-105 hover:bg-indigo-100 focus-visible:outline-indigo-600 motion-reduce:hover:scale-100 dark:hover:bg-indigo-900/50">
              <span class="w-9 text-[0.625rem] font-bold"
                :class="methodColor(endpoint.method)">{{ endpoint.method }}</span>
              <span
                class="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-200">{{ endpoint.title }}</span>
              <PhArrowRight :size="15"
                class="text-zinc-500 transition-transform duration-150 group-hover:translate-x-0.5 dark:text-slate-500" />
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import { endpointDocs, type HttpMethod } from '~/data/apiDocs'

definePageMeta({ layout: 'docs' })
useHead({ title: 'API documentation | BlueHouse' })

const groups = [
  { name: 'BlueHouse API', slug: 'api', description: 'Public and internal routes served by this application.', items: endpointDocs.filter(item => item.group === 'BlueHouse API') },
  { name: 'Ámbito reference', slug: 'ambito', description: 'Historical upstream routes, mapped to BlueHouse house names.', items: endpointDocs.filter(item => item.group === 'Ámbito reference') },
]

const methodColor = (method: HttpMethod) => method === 'POST'
  ? 'text-amber-700 dark:text-amber-400'
  : 'text-emerald-700 dark:text-emerald-400'
</script>
