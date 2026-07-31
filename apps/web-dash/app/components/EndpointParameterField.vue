<template>
  <label class="block text-xs font-medium">
    {{ parameter.name }}
    <input :value="modelValue" :type="inputType"
      class="mt-1.5 min-h-10 w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm outline-none focus:border-indigo-600 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-900"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </label>
</template>

<script setup lang="ts">
import type { DocParameter } from '~/data/apiDocs'

const props = defineProps<{
  parameter: DocParameter
  modelValue: string
  ambitoHouse?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const inputType = computed(() => props.parameter.name.toLowerCase().includes('date') && !props.ambitoHouse ? 'date' : 'text')
</script>
