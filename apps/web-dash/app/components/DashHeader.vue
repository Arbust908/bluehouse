<template>
  <header class="relative border-b border-[var(--color-rule)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[var(--color-accent)]">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
      <NuxtLink to="/" class="group flex items-center gap-3 rounded-sm" aria-label="BlueHouse, inicio">
        <span class="grid size-7 place-items-center rounded-md bg-[var(--color-accent)] text-xs font-bold text-[oklch(18%_0.012_65)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
          B
        </span>
        <span class="text-base font-semibold tracking-[-0.025em]">BlueHouse</span>
      </NuxtLink>
      <div class="flex items-center gap-3">
        <p class="hidden text-xs font-medium tracking-wide text-[var(--color-muted)] sm:block">Dólar argentino</p>
        <ClientOnly>
          <ThemeController />
          <template #fallback>
            <span class="block size-10 rounded-full border border-[var(--color-rule)]" aria-hidden="true" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
