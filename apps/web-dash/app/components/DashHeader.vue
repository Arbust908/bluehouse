<template>
  <header
    class="relative border-b border-zinc-300 dark:border-slate-700 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-indigo-600">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
      <NuxtLink to="/" class="group flex items-center gap-3 rounded-sm" aria-label="BlueHouse, inicio">
        <span
          class="grid place-items-center rounded bg-indigo-600 transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
          <PhApproximateEquals :size="28" weight="bold" class="col-start-1 row-start-1 translate-x-2 text-rose-500" />
          <PhHouseSimple :size="32" weight="fill" class="col-start-1 row-start-1" />
        </span>
        <span class="text-base font-semibold tracking-tight">BlueHouse</span>
      </NuxtLink>
      <div class="flex items-center gap-3">
        <ClientOnly>
          <ThemeController />
          <template #fallback>
            <span class="block size-10 rounded-full border border-zinc-300 dark:border-slate-700" aria-hidden="true" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
import { PhHouseSimple, PhApproximateEquals } from '@phosphor-icons/vue';
</script>
