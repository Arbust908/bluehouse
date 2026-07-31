<template>
  <button type="button" role="tab" :aria-selected="selected"
    class="min-h-10 border-b border-transparent px-3 text-xs font-medium text-zinc-500 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:text-slate-200"
    :class="{ 'border-indigo-600 text-zinc-800 dark:text-slate-200': selected }" @click="emit('select')">
    {{ language }}
  </button>
</template>

<script setup lang="ts">
defineProps<{ language: string; selected: boolean }>()
const emit = defineEmits<{ select: [] }>()
</script>
