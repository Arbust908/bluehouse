<template>
  <footer class="mt-16 border-t border-zinc-300 dark:border-slate-700">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-6 text-xs text-zinc-500 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <p>Valores informativos, expresados en pesos argentinos.</p>
      <div class="flex items-center gap-3">
        <NuxtLink to="https://www.panchoblanco.dev/"
          class="rounded-sm transition ease-in-out duration-150 p-2 hover:bg-indigo-200/50 hover:dark:bg-indigo-800/50">
          by
          PanchoBlanco</NuxtLink>
        <NuxtLink to="https://github.com/Arbust908"
          class="rounded-sm transition ease-in-out duration-150 p-2 hover:bg-indigo-200/50 hover:dark:bg-indigo-800/50">
          <PhGithubLogo :size="24" />
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { PhGithubLogo } from '@phosphor-icons/vue';
</script>