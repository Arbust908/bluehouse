<template>
  <details class="endpoint-group group/super mt-2" @toggle="emit('toggle', group.name, $event)">
    <summary
      class="nav-link flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-zinc-800 transition-colors duration-150 hover:bg-indigo-100 focus-visible:outline-indigo-600 dark:text-slate-200 dark:hover:bg-indigo-900/50"
      :class="{ 'justify-center': collapsed }">
      <PhCaretRight :size="15"
        class="group-caret shrink-0 text-zinc-500 transition-transform duration-150 dark:text-slate-500" />
      <AnimatePresence :initial="false">
        <motion.span v-if="!collapsed" :initial="labelInitial" :animate="labelVisible" :exit="labelExit"
          :transition="labelTransition" class="min-w-0 flex-1 truncate">{{ group.name }}</motion.span>
      </AnimatePresence>
      <AnimatePresence :initial="false">
        <motion.span v-if="!collapsed" :initial="labelInitial" :animate="labelVisible" :exit="labelExit"
          :transition="labelTransition" class="text-xs font-medium tabular-nums text-zinc-500 dark:text-slate-500">
          {{ group.items.length }}
        </motion.span>
      </AnimatePresence>
    </summary>
    <div class="mt-0.5 space-y-0.5">
      <DocsSidebarEndpoint v-for="(item, itemIndex) in group.items" :key="item.slug" :item="item"
        :item-index="itemIndex" :label-index="labelIndex + itemIndex + 1" :collapsed="collapsed" :open="open"
        @close="emit('close')" />
    </div>
  </details>
</template>

<script setup lang="ts">
import { PhCaretRight } from '@phosphor-icons/vue'
import { AnimatePresence, motion } from 'motion-v'
import type { EndpointDoc } from '~/data/apiDocs'

const props = defineProps<{
  group: { name: string; items: EndpointDoc[] }
  labelIndex: number
  collapsed: boolean
  open: boolean
}>()
const emit = defineEmits<{
  close: []
  toggle: [groupName: string, event: Event]
}>()

const labelInitial = { opacity: 0, x: -8 }
const labelVisible = { opacity: 1, x: 0 }
const labelExit = { opacity: 0, x: -6, transition: { duration: 0.1 } }
const labelTransition = computed(() => ({
  type: 'tween' as const,
  duration: 0.18,
  delay: props.labelIndex * 0.025,
  ease: 'easeOut' as const,
}))
</script>

<style scoped>
.endpoint-group[open] .group-caret {
  transform: rotate(90deg);
}

.endpoint-group summary::-webkit-details-marker {
  display: none;
}
</style>
