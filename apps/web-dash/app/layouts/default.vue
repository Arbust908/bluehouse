<template>
  <div class="flex min-h-dvh flex-col bg-[var(--color-paper)]">
    <DashHeader />
    <div class="flex-1">
      <slot />
    </div>
    <DashFooter />
  </div>
</template>
