<template>
  <div class="h-screen flex flex-col">
    <DashHeader />
    <div class="flex-1">
      <slot />
    </div>
    <DashFooter />
  </div>
</template>