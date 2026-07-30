<template>
  <article class="rounded-xl bg-zinc-50 dark:bg-slate-950 p-5 sm:p-6">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h3 class="text-xs font-semibold uppercase text-indigo-800 dark:text-indigo-200">{{ title }}</h3>
        <p class="numeric text-4xl font-light">
          {{ value }}
        </p>
        <small class="opacity-50">Promedio</small>
      </div>
    </div>
    <dl class="numeric mt-4 flex gap-6 border-t border-zinc-300 dark:border-slate-600 pt-4 text-sm">
      <dl>
        <dt class="text-xs opacity-50">Compra</dt>
        <dd>{{ buy }}</dd>
      </dl>
      <dl>
        <dt class="text-xs opacity-50">Venta</dt>
        <dd>{{ sell }}</dd>
      </dl>
    </dl>
  </article>
</template>
<script setup lang="ts">
interface Props {
  title: string;
  value: string;
  buy: string;
  sell: string;
}
defineProps<Props>()
</script>