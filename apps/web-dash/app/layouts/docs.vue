<template>
  <div class="min-h-dvh bg-(--color-paper) text-(--color-ink)">
    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-zinc-950/35 lg:hidden" aria-hidden="true" @click="sidebarOpen = false" />
    <div class="flex min-h-dvh">
      <DocsSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
      <div class="min-w-0 flex-1">
        <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-(--color-rule) bg-(--color-paper)/95 px-4 backdrop-blur-sm lg:px-6">
          <button type="button" class="grid size-10 place-items-center rounded-md text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-ink) lg:hidden" aria-label="Open navigation" @click="sidebarOpen = true">
            <PhList :size="20" />
          </button>
          <NuxtLink to="/docs" class="text-xs font-semibold text-(--color-muted) lg:hidden">Documentation</NuxtLink>
          <div class="ml-auto flex items-center gap-2">
            <NuxtLink to="/" class="inline-flex min-h-10 items-center rounded-md px-3 text-xs font-medium text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-ink)">View rates</NuxtLink>
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
