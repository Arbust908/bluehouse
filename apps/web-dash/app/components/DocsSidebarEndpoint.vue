<template>
  <motion.div :initial="hidden" :animate="open ? visible : hidden" :transition="endpointTransition">
    <NuxtLink :to="`/docs/${item.slug}`"
      class="nav-link flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors duration-150 hover:bg-indigo-100 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:bg-indigo-900/50 dark:hover:text-slate-200 [&.router-link-exact-active]:bg-indigo-100 [&.router-link-exact-active]:text-zinc-800 dark:[&.router-link-exact-active]:bg-indigo-900/50 dark:[&.router-link-exact-active]:text-slate-200"
      :class="{ 'justify-center': collapsed }" :title="item.title" @click="emit('close')">
      <span class="w-8 shrink-0 text-xs font-bold" :class="[methodColor, { 'text-center': collapsed }]">
        {{ collapsed ? item.method.slice(0, 1) : item.method }}
      </span>
      <AnimatePresence :initial="false">
        <motion.span v-if="!collapsed" :initial="labelInitial" :animate="labelVisible" :exit="labelExit"
          :transition="labelTransition" class="truncate">{{ item.title }}</motion.span>
      </AnimatePresence>
    </NuxtLink>
  </motion.div>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import type { EndpointDoc } from '~/data/apiDocs'

const props = defineProps<{
  item: EndpointDoc
  itemIndex: number
  labelIndex: number
  collapsed: boolean
  open: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const hidden = { opacity: 0, x: -14 }
const visible = { opacity: 1, x: 0 }
const labelInitial = { opacity: 0, x: -8 }
const labelVisible = { opacity: 1, x: 0 }
const labelExit = { opacity: 0, x: -6, transition: { duration: 0.1 } }
const endpointTransition = computed(() => ({
  type: 'spring' as const,
  stiffness: 320,
  damping: 28,
  mass: 0.7,
  delay: props.itemIndex * 0.055,
}))
const labelTransition = computed(() => ({
  type: 'tween' as const,
  duration: 0.18,
  delay: props.labelIndex * 0.025,
  ease: 'easeOut' as const,
}))
const methodColor = computed(() => props.item.method === 'POST'
  ? 'text-amber-700 dark:text-amber-400'
  : 'text-emerald-700 dark:text-emerald-400')
</script>
