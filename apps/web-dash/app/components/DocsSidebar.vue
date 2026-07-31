<template>
  <aside
    class="docs-sidebar fixed inset-y-0 left-0 z-40 flex w-72 border-r border-(--color-rule) bg-(--color-paper) transition-[width,transform] duration-200 ease-out lg:sticky lg:top-0 lg:h-dvh"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="sidebar-header flex h-16 items-center justify-between border-b border-(--color-rule) px-4">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-2.5 rounded-sm" aria-label="BlueHouse home">
          <span class="grid size-8 shrink-0 place-items-center rounded-md bg-indigo-600 text-white">
            <PhHouseSimple :size="19" weight="fill" />
          </span>
          <span class="sidebar-label truncate text-sm font-semibold tracking-tight">BlueHouse Docs</span>
        </NuxtLink>
        <button type="button" class="sidebar-label grid size-9 place-items-center rounded-md text-(--color-muted) hover:bg-(--color-accent-soft) hover:text-(--color-ink) lg:hidden" aria-label="Close navigation" @click="emit('close')">
          <PhX :size="18" />
        </button>
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-2 py-4" aria-label="Documentation">
        <NuxtLink to="/docs" class="nav-link" @click="emit('close')">
          <PhBookOpenText :size="18" class="shrink-0" />
          <span class="sidebar-label">Overview</span>
        </NuxtLink>
        <div v-for="group in groups" :key="group.name" class="mt-6 first:mt-2">
          <p class="sidebar-label px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-(--color-muted)">{{ group.name }}</p>
          <div class="space-y-0.5">
            <NuxtLink
              v-for="item in group.items"
              :key="item.slug"
              :to="`/docs/${item.slug}`"
              class="nav-link"
              :title="item.title"
              @click="emit('close')"
            >
              <span class="sidebar-method w-8 shrink-0 text-[0.625rem] font-bold" :class="methodColor(item.method)"><span class="method-full">{{ item.method }}</span><span class="method-short">{{ item.method.slice(0, 1) }}</span></span>
              <span class="sidebar-label truncate">{{ item.title }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="border-t border-(--color-rule) p-2">
        <label class="nav-link hidden w-full cursor-pointer lg:flex">
          <input type="checkbox" class="sidebar-toggle sr-only" aria-label="Collapse or expand sidebar" />
          <PhSidebarSimple :size="18" class="sidebar-toggle-icon shrink-0" />
          <span class="sidebar-label">Collapse</span>
        </label>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { PhBookOpenText, PhHouseSimple, PhSidebarSimple, PhX } from '@phosphor-icons/vue'
import { endpointDocs, type HttpMethod } from '~/data/apiDocs'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const groups = [
  { name: 'BlueHouse API', items: endpointDocs.filter(item => item.group === 'BlueHouse API') },
  { name: 'Ámbito reference', items: endpointDocs.filter(item => item.group === 'Ámbito reference') },
]

const methodColor = (method: HttpMethod) => method === 'POST' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
</script>

<style scoped>
.nav-link {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-muted);
  font-size: 0.8125rem;
  transition: background-color 160ms cubic-bezier(0.16, 1, 0.3, 1), color 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-link:hover,
.router-link-exact-active {
  background: var(--color-accent-soft);
  color: var(--color-ink);
}

.method-short {
  display: none;
}

.docs-sidebar:has(.sidebar-toggle:checked) {
  width: 4.5rem;
}

.docs-sidebar:has(.sidebar-toggle:checked) .sidebar-label {
  display: none;
}

.docs-sidebar:has(.sidebar-toggle:checked) .sidebar-header,
.docs-sidebar:has(.sidebar-toggle:checked) .nav-link {
  justify-content: center;
}

.docs-sidebar:has(.sidebar-toggle:checked) .sidebar-method {
  text-align: center;
}

.docs-sidebar:has(.sidebar-toggle:checked) .method-full {
  display: none;
}

.docs-sidebar:has(.sidebar-toggle:checked) .method-short {
  display: inline;
}

.docs-sidebar:has(.sidebar-toggle:checked) .sidebar-toggle-icon {
  transform: rotate(180deg);
}
</style>
