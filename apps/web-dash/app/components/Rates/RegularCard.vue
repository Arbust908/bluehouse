<template>
  <article class="rounded-xl border border-zinc-300 dark:border-slate-700 p-3">
    <h3 class="text-sm text-indigo-800 dark:text-indigo-200">{{ title }}</h3>
    <dl class="numeric mt-2 grid md:grid-cols-2 gap-2 pt-4 text-sm md:text-center">
      <dl class="col-span-full">
        <dt class="text-xs opacity-50">Promedio</dt>
        <dd class="mt-0.5 font-bold">{{ value }}</dd>
      </dl>
      <dl>
        <dt class="text-xs opacity-50">Compra</dt>
        <dd class="mt-0.5 font-bold">{{ buy }}</dd>
      </dl>
      <dl>
        <dt class="text-xs opacity-50">Venta</dt>
        <dd class="mt-0.5 font-bold">{{ sell }}</dd>
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