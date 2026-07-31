<template>
  <li>
    <NuxtLink :to="`/docs/${endpoint.slug}`"
      class="group -mx-2 flex min-h-12 items-center gap-3 rounded-md px-2 transition duration-150 ease-out hover:scale-105 hover:bg-indigo-100 focus-visible:outline-indigo-600 motion-reduce:hover:scale-100 dark:hover:bg-indigo-900/50">
      <span class="w-9 text-xs font-bold" :class="methodColor">{{ endpoint.method }}</span>
      <span class="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-200">
        {{ endpoint.title }}
      </span>
      <PhArrowRight :size="15"
        class="text-zinc-500 transition-transform duration-150 group-hover:translate-x-0.5 dark:text-slate-500" />
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import type { EndpointDoc } from '~/data/apiDocs'

const props = defineProps<{ endpoint: EndpointDoc }>()
const methodColor = computed(() => props.endpoint.method === 'POST'
  ? 'text-amber-700 dark:text-amber-400'
  : 'text-emerald-700 dark:text-emerald-400')
</script>
