<template>
  <main class="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
    <p class="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600 dark:text-indigo-400">BlueHouse API</p>
    <h1 class="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Exchange-rate data, without guesswork.</h1>
    <p class="mt-4 max-w-2xl text-base leading-7 text-(--color-muted)">Reference for BlueHouse endpoints and the Ámbito historical sources used by the poller. Every endpoint page includes its current contract, an executable request, and examples for common clients.</p>

    <div class="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
      <section v-for="group in groups" :key="group.name" :aria-labelledby="`${group.slug}-title`">
        <div class="border-b border-(--color-rule) pb-3">
          <h2 :id="`${group.slug}-title`" class="text-base font-semibold">{{ group.name }}</h2>
          <p class="mt-1 text-sm text-(--color-muted)">{{ group.description }}</p>
        </div>
        <ul class="divide-y divide-(--color-rule)">
          <li v-for="endpoint in group.items" :key="endpoint.slug">
            <NuxtLink :to="`/docs/${endpoint.slug}`" class="group flex items-center gap-3 py-3.5">
              <span class="w-9 text-[0.625rem] font-bold" :class="endpoint.method === 'POST' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'">{{ endpoint.method }}</span>
              <span class="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{{ endpoint.title }}</span>
              <PhArrowRight :size="15" class="text-(--color-muted) transition-transform duration-150 group-hover:translate-x-0.5" />
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import { endpointDocs } from '~/data/apiDocs'

definePageMeta({ layout: 'docs' })
useHead({ title: 'API documentation | BlueHouse' })

const groups = [
  { name: 'BlueHouse API', slug: 'api', description: 'Public and internal routes served by this application.', items: endpointDocs.filter(item => item.group === 'BlueHouse API') },
  { name: 'Ámbito reference', slug: 'ambito', description: 'Historical upstream routes, mapped to BlueHouse house names.', items: endpointDocs.filter(item => item.group === 'Ámbito reference') },
]
</script>
