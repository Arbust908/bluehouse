<template>
  <section :aria-labelledby="headingId">
    <h2 v-if="title" :id="headingId" class="text-xl font-semibold tracking-tight">{{ title }}</h2>
    <div class="overflow-x-auto" :class="{ 'mt-4': title }">
      <table class="w-full min-w-136 border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-zinc-300 text-xs text-zinc-500 dark:border-slate-700 dark:text-slate-500">
            <th class="py-2 pr-4 font-medium">Field</th>
            <th class="py-2 pr-4 font-medium">Type</th>
            <th class="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-300 dark:divide-slate-700">
          <DocsFieldRow v-for="field in fields" :key="field.name" :field="field" />
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DocField } from '~/data/apiDocs'

const props = defineProps<{ title: string; fields: DocField[] }>()
const headingId = computed(() => `${props.title.toLowerCase().replaceAll(' ', '-') || 'fields'}-title`)
</script>
