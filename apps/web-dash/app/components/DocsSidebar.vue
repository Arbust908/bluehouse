<template>
  <aside
    class="docs-sidebar fixed inset-y-0 left-0 z-40 flex w-72 border-r border-zinc-300 bg-zinc-100 transition-[width,transform] duration-200 ease-out dark:border-slate-700 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-dvh"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'">
    <div class="flex min-w-0 flex-1 flex-col">
      <div
        class="sidebar-header flex h-16 items-center justify-between border-b border-zinc-300 px-4 dark:border-slate-700">
        <LayoutIcon :collapsed="collapsed" />
        <button type="button"
          class="sidebar-label grid size-10 place-items-center rounded-md text-zinc-500 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 lg:hidden"
          aria-label="Close navigation" @click="emit('close')">
          <PhX :size="18" />
        </button>
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-2 py-4" aria-label="Documentation">
        <NuxtLink to="/docs"
          class="nav-link flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-[0.8125rem] text-zinc-500 transition-colors duration-150 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 [&.router-link-exact-active]:bg-indigo-100 [&.router-link-exact-active]:text-zinc-800 dark:[&.router-link-exact-active]:bg-indigo-900/50 dark:[&.router-link-exact-active]:text-slate-200"
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
        <details
          v-for="(group, groupIndex) in groups"
          :key="group.name"
          class="endpoint-group group/super mt-2"
          @toggle="setGroupOpen(group.name, $event)"
        >
          <summary
            class="nav-link flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-[0.8125rem] font-[650] text-zinc-800 transition-colors duration-150 hover:bg-indigo-100 focus-visible:outline-indigo-600 dark:text-slate-200 dark:hover:bg-indigo-900/50">
            <PhCaretRight :size="15"
              class="group-caret shrink-0 text-zinc-500 transition-transform duration-150 dark:text-slate-500" />
            <AnimatePresence :initial="false">
              <motion.span
                v-if="!collapsed"
                :initial="labelInitial"
                :animate="labelVisible"
                :exit="labelExit"
                :transition="labelTransition(groupLabelIndex(groupIndex))"
                class="sidebar-label min-w-0 flex-1 truncate"
              >{{ group.name }}</motion.span>
            </AnimatePresence>
            <AnimatePresence :initial="false">
              <motion.span
                v-if="!collapsed"
                :initial="labelInitial"
                :animate="labelVisible"
                :exit="labelExit"
                :transition="labelTransition(groupLabelIndex(groupIndex))"
                class="sidebar-label text-[0.6875rem] font-medium tabular-nums text-zinc-500 dark:text-slate-500"
              >{{ group.items.length }}</motion.span>
            </AnimatePresence>
          </summary>
          <div class="mt-0.5 space-y-0.5">
            <motion.div
              v-for="(item, itemIndex) in group.items"
              :key="item.slug"
              :initial="endpointHidden"
              :animate="openGroups.has(group.name) ? endpointVisible : endpointHidden"
              :transition="endpointTransition(itemIndex)"
            >
              <NuxtLink :to="`/docs/${item.slug}`"
                class="nav-link flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-[0.8125rem] text-zinc-500 transition-colors duration-150 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 [&.router-link-exact-active]:bg-indigo-100 [&.router-link-exact-active]:text-zinc-800 dark:[&.router-link-exact-active]:bg-indigo-900/50 dark:[&.router-link-exact-active]:text-slate-200"
                :title="item.title" @click="emit('close')">
                <span class="sidebar-method w-8 shrink-0 text-[0.625rem] font-bold"
                  :class="methodColor(item.method)"><span class="method-full">{{ item.method }}</span><span
                    class="method-short">{{ item.method.slice(0, 1) }}</span></span>
                <AnimatePresence :initial="false">
                  <motion.span
                    v-if="!collapsed"
                    :initial="labelInitial"
                    :animate="labelVisible"
                    :exit="labelExit"
                    :transition="labelTransition(itemLabelIndex(groupIndex, itemIndex))"
                    class="sidebar-label truncate"
                  >{{ item.title }}</motion.span>
                </AnimatePresence>
              </NuxtLink>
            </motion.div>
          </div>
        </details>
      </nav>

      <div class="border-t border-zinc-300 p-2 dark:border-slate-700">
        <label
          class="nav-link hidden min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[0.8125rem] text-zinc-500 hover:bg-indigo-100 hover:text-zinc-800 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 lg:flex">
          <input v-model="collapsed" type="checkbox" class="sidebar-toggle sr-only"
            aria-label="Collapse or expand sidebar" />
          <PhSidebarSimple :size="18" class="sidebar-toggle-icon shrink-0" />
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
import { PhBookOpenText, PhCaretRight, PhSidebarSimple, PhX } from '@phosphor-icons/vue'
import { AnimatePresence, motion } from 'motion-v'
import { endpointDocs, type HttpMethod } from '~/data/apiDocs'

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
const itemLabelIndex = (groupIndex: number, itemIndex: number) => groupLabelIndex(groupIndex) + itemIndex + 1
const collapseLabelIndex = 1 + groups.reduce((index, group) => index + group.items.length + 1, 0)
const endpointHidden = { opacity: 0, x: -14 }
const endpointVisible = { opacity: 1, x: 0 }
const endpointTransition = (index: number) => ({
  type: 'spring' as const,
  stiffness: 320,
  damping: 28,
  mass: 0.7,
  delay: index * 0.055,
})

const setGroupOpen = (groupName: string, event: Event) => {
  const nextOpenGroups = new Set(openGroups.value)

  if ((event.currentTarget as HTMLDetailsElement).open) {
    nextOpenGroups.add(groupName)
  } else {
    nextOpenGroups.delete(groupName)
  }

  openGroups.value = nextOpenGroups
}

const methodColor = (method: HttpMethod) => method === 'POST'
  ? 'text-amber-700 dark:text-amber-400'
  : 'text-emerald-700 dark:text-emerald-400'

</script>

<style scoped>
.method-short {
  display: none;
}

.endpoint-group[open] .group-caret {
  transform: rotate(90deg);
}

.endpoint-group summary::-webkit-details-marker {
  display: none;
}

.docs-sidebar:has(.sidebar-toggle:checked) {
  width: 4.5rem;
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
