<template>
  <button ref="themeButton" type="button"
    class="grid size-10 place-items-center rounded-full border border-zinc-300 dark:border-slate-700 text-zinc-500 dark:text-slate-200 transition-colors duration-200 hover:border-indigo-500 hover:text-zinc-800 hover:dark:text-slate-300"
    :aria-label="isDark ? 'Activar tema claro' : 'Activar tema oscuro'" :aria-pressed="isDark"
    :title="isDark ? 'Activar tema claro' : 'Activar tema oscuro'" @click="toggleTheme">
    <Transition name="theme-icon" mode="out-in">
      <svg v-if="isDark" key="sun" aria-hidden="true" class="size-4" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </svg>
      <svg v-else key="moon" aria-hidden="true" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" />
      </svg>
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { useDark, usePreferredReducedMotion, useToggle } from '@vueuse/core';

const isDark = useDark({ storageKey: 'bluehouse-color-scheme' })
const toggleDark = useToggle(isDark)
const reducedMotion = usePreferredReducedMotion()
const themeButton = useTemplateRef<HTMLButtonElement>('themeButton')

async function toggleTheme() {
  const startViewTransition = document.startViewTransition?.bind(document)
  if (!startViewTransition || reducedMotion.value === 'reduce' || !themeButton.value) {
    toggleDark()
    return
  }

  const { left, top, width, height } = themeButton.value.getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const transition = startViewTransition(async () => {
    toggleDark()
    await nextTick()
  })

  try {
    await transition.ready
    document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 500,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  } catch {
    // The theme has already changed; only the optional reveal animation failed.
  }
}
</script>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 140ms ease-out, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-35deg) scale(0.65);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(35deg) scale(0.65);
}
</style>
