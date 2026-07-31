<template>
  <tr class="align-top">
    <td class="py-3 pr-4 font-mono text-xs font-semibold">
      {{ field.name }}<span v-if="field.required" class="ml-1 text-indigo-800 dark:text-indigo-200" title="Required">*</span>
    </td>
    <td class="py-3 pr-4 font-mono text-xs text-zinc-500 dark:text-slate-500">{{ field.type }}</td>
    <td class="max-w-md py-3 leading-6 text-zinc-600 dark:text-slate-300">{{ field.description }}</td>
  </tr>
</template>

<script setup lang="ts">
import type { DocField } from '~/data/apiDocs'

defineProps<{ field: DocField }>()
</script>
