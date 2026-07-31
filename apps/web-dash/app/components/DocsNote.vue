<template>
  <p class="text-sm leading-6 text-zinc-800 dark:text-slate-200">{{ note }}</p>
</template>

<script setup lang="ts">
defineProps<{ note: string }>()
</script>
