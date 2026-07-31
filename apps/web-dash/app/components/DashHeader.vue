<template>
  <header
    class="relative border-b border-zinc-300 dark:border-slate-700 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-indigo-600">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
      <LayoutIcon />
      <div class="flex items-center gap-3">
        <ClientOnly>
          <ThemeController />
          <template #fallback>
            <span class="block size-10 rounded-full border border-zinc-300 dark:border-slate-700" aria-hidden="true" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
