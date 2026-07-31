<template>
  <div class="flex items-center justify-between gap-5 py-3.5 sm:px-5"
    :class="divided ? 'border-b border-zinc-300 dark:border-slate-700 sm:border-r sm:border-b-0 sm:pl-0' : 'sm:pr-0'">
    <dt class="flex items-center gap-2 text-xs uppercase tracking-tight text-zinc-600 dark:text-slate-300">
      {{ item.label }}
    </dt>
    <dd class="numeric text-right text-sm font-bold text-zinc-800 dark:text-slate-200">
      {{ item.value }}
      <span class="ml-1 hidden font-normal text-zinc-500 dark:text-slate-500 lg:inline">{{ item.detail }}</span>
    </dd>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  item: { label: string; value: string; detail: string }
  divided: boolean
}>()
</script>
