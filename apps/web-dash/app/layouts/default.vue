<template>
  <div class="flex min-h-dvh flex-col bg-(--color-paper)">
    <DashHeader />
    <div class="flex-1">
      <slot />
    </div>
    <DashFooter />
  </div>
</template>
