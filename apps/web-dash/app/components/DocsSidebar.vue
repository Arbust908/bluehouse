<template>
  <aside
    class="docs-sidebar fixed inset-y-0 left-0 z-40 flex w-72 border-r border-zinc-300 bg-zinc-100 transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-dvh"
    :class="[open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0', collapsed ? 'lg:w-18' : 'lg:w-72']">
    <div class="flex min-w-0 flex-1 flex-col">
      <div
        class="sidebar-header flex h-16 items-center justify-between border-b border-zinc-300 px-4 dark:border-slate-700"
        :class="{ 'lg:justify-center': collapsed }">
        <LayoutIcon :collapsed="collapsed" />
        <button type="button"
          class="sidebar-label grid size-10 place-items-center rounded-md text-zinc-500 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 lg:hidden"
          aria-label="Close navigation" @click="emit('close')">
          <PhX :size="18" />
        </button>
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-2 py-4" aria-label="Documentation">
        <NuxtLink to="/docs"
          class="nav-link flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors duration-150 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 [&.router-link-exact-active]:bg-indigo-100 [&.router-link-exact-active]:text-zinc-800 dark:[&.router-link-exact-active]:bg-indigo-900/50 dark:[&.router-link-exact-active]:text-slate-200"
          :class="{ 'justify-center': collapsed }"
          @click="emit('close')">
          <PhBookOpenText :size="18" class="shrink-0" />
          <AnimatePresence :initial="false">
            <motion.span
              v-if="!collapsed"
              :initial="labelInitial"
              :animate="labelVisible"
              :exit="labelExit"
              :transition="labelTransition(0)"
              class="sidebar-label"
            >Overview</motion.span>
          </AnimatePresence>
        </NuxtLink>
        <DocsSidebarGroup
          v-for="(group, groupIndex) in groups"
          :key="group.name"
          :group="group"
          :label-index="groupLabelIndex(groupIndex)"
          :collapsed="collapsed"
          :open="openGroups.has(group.name)"
          @close="emit('close')"
          @toggle="setGroupOpen"
        />
      </nav>

      <div class="border-t border-zinc-300 p-2 dark:border-slate-700">
        <label
          class="nav-link hidden min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-indigo-100 hover:text-zinc-800 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 lg:flex"
          :class="{ 'justify-center': collapsed }">
          <input v-model="collapsed" type="checkbox" class="sidebar-toggle sr-only"
            aria-label="Collapse or expand sidebar" />
          <PhSidebarSimple :size="18" class="shrink-0" :class="{ 'rotate-180': collapsed }" />
          <AnimatePresence :initial="false">
            <motion.span
              v-if="!collapsed"
              :initial="labelInitial"
              :animate="labelVisible"
              :exit="labelExit"
              :transition="labelTransition(collapseLabelIndex)"
              class="sidebar-label"
            >Collapse</motion.span>
          </AnimatePresence>
        </label>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { PhBookOpenText, PhSidebarSimple, PhX } from '@phosphor-icons/vue'
import { AnimatePresence, motion } from 'motion-v'
import { endpointDocs } from '~/data/apiDocs'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const collapsed = ref(false)
const openGroups = ref(new Set<string>())

const groups = [
  { name: 'BlueHouse API', items: endpointDocs.filter(item => item.group === 'BlueHouse API') },
  { name: 'Ámbito reference', items: endpointDocs.filter(item => item.group === 'Ámbito reference') },
]

const labelInitial = { opacity: 0, x: -8 }
const labelVisible = { opacity: 1, x: 0 }
const labelExit = { opacity: 0, x: -6, transition: { duration: 0.1 } }
const labelTransition = (index: number) => ({
  type: 'tween' as const,
  duration: 0.18,
  delay: index * 0.025,
  ease: 'easeOut' as const,
})
const groupLabelIndex = (groupIndex: number) => 1 + groups
  .slice(0, groupIndex)
  .reduce((index, group) => index + group.items.length + 1, 0)
const collapseLabelIndex = 1 + groups.reduce((index, group) => index + group.items.length + 1, 0)

const setGroupOpen = (groupName: string, event: Event) => {
  const nextOpenGroups = new Set(openGroups.value)

  if ((event.currentTarget as HTMLDetailsElement).open) {
    nextOpenGroups.add(groupName)
  } else {
    nextOpenGroups.delete(groupName)
  }

  openGroups.value = nextOpenGroups
}
</script>
