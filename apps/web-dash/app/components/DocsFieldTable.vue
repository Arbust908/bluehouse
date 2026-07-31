<template>
  <section :aria-labelledby="headingId">
    <h2 v-if="title" :id="headingId" class="text-xl font-semibold tracking-[-0.025em]">{{ title }}</h2>
    <div class="overflow-x-auto" :class="{ 'mt-4': title }">
      <table class="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-(--color-rule) text-xs text-(--color-muted)">
            <th class="py-2 pr-4 font-medium">Field</th>
            <th class="py-2 pr-4 font-medium">Type</th>
            <th class="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--color-rule)">
          <tr v-for="field in fields" :key="field.name" class="align-top">
            <td class="py-3 pr-4 font-mono text-xs font-semibold">{{ field.name }}<span v-if="field.required" class="ml-1 text-indigo-600 dark:text-indigo-400" title="Required">*</span></td>
            <td class="py-3 pr-4 font-mono text-xs text-(--color-muted)">{{ field.type }}</td>
            <td class="max-w-md py-3 leading-6 text-(--color-muted)">{{ field.description }}</td>
          </tr>
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
