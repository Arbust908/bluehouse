<template>
  <section :aria-labelledby="`${group.slug}-title`">
    <div class="pb-3">
      <h2 :id="`${group.slug}-title`" class="text-base font-semibold leading-tight">{{ group.name }}</h2>
      <p class="mt-1 text-sm text-zinc-600 dark:text-slate-300">{{ group.description }}</p>
    </div>
    <ul class="divide-y divide-zinc-300 dark:divide-slate-700">
      <DocsEndpointLink v-for="endpoint in group.items" :key="endpoint.slug" :endpoint="endpoint" />
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { EndpointDoc } from '~/data/apiDocs'

defineProps<{
  group: {
    name: string
    slug: string
    description: string
    items: EndpointDoc[]
  }
}>()
</script>
