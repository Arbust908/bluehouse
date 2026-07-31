<template>
  <li class="flex items-center gap-1.5">
    <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }" />
    {{ item.name }}
  </li>
</template>

<script setup lang="ts">
defineProps<{ item: { name: string; color: string } }>()
</script>
