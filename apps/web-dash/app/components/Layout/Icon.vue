<template>
  <NuxtLink to="/" class="group flex items-center gap-3 rounded-sm" aria-label="BlueHouse, inicio">
    <span
      class="grid place-items-center rounded bg-indigo-600 transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
      <PhApproximateEquals :size="linesSize" weight="bold"
        class="col-start-1 row-start-1 translate-x-2 text-rose-500" />
      <PhHouseSimple :size="size" weight="fill" class="col-start-1 row-start-1 text-zinc-100 dark:text-slate-900" />
    </span>
    <AnimatePresence :initial="false">
      <motion.span v-if="!collapsed" :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: -6 }" :transition="{ type: 'tween', duration: 0.16, ease: 'easeOut' }"
        class="text-base font-semibold tracking-tight">
        BlueHouse
      </motion.span>
    </AnimatePresence>
  </NuxtLink>
</template>

<script setup lang="ts">
import { PhHouseSimple, PhApproximateEquals } from '@phosphor-icons/vue'
import { AnimatePresence, motion } from 'motion-v'

interface Props {
  collapsed?: boolean;
  size?: number;
}

const props = withDefaults(defineProps<Props>(),
  {
    collapsed: false,
    size: 32
  }
)

const linesSize = computed(() => {
  return props.size * 0.875
})
</script>
