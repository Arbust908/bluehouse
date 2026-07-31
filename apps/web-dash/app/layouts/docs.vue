<template>
  <div class="min-h-dvh bg-zinc-100 text-zinc-800 dark:bg-slate-900 dark:text-slate-200">
    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-zinc-950/35 lg:hidden" aria-hidden="true" @click="sidebarOpen = false" />
    <div class="flex min-h-dvh">
      <DocsSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
      <div class="min-w-0 flex-1">
        <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-300 bg-zinc-100 px-4 dark:border-slate-700 dark:bg-slate-900 lg:px-6">
          <button type="button" class="grid size-10 place-items-center rounded-md text-zinc-500 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 lg:hidden" aria-label="Open navigation" @click="sidebarOpen = true">
            <PhList :size="20" />
          </button>
          <NuxtLink to="/docs" class="text-xs font-[650] text-zinc-500 focus-visible:outline-indigo-600 dark:text-slate-500 lg:hidden">Documentation</NuxtLink>
          <div class="ml-auto flex items-center gap-2">
            <NuxtLink to="/" class="inline-flex min-h-10 items-center rounded-md px-3 text-xs font-medium text-zinc-500 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200">View rates</NuxtLink>
            <ClientOnly><ThemeController /></ClientOnly>
          </div>
        </header>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhList } from '@phosphor-icons/vue'

const sidebarOpen = ref(false)
</script>
