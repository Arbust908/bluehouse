<template>
  <div class="flex min-h-dvh flex-col bg-zinc-100 dark:bg-slate-900 text-zinc-800 dark:text-slate-200">
    <DashHeader />
    <div class="flex-1">
      <slot />
    </div>
    <DashFooter />
  </div>
</template>
