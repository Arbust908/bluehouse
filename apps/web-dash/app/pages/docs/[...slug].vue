<template>
  <main v-if="doc" class="mx-auto max-w-screen-2xl px-5 py-10 sm:px-8 lg:py-14">
    <div class="grid items-start gap-12 xl:grid-cols-2">
      <article class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-slate-500">{{ doc.group }}</p>
        <div
          class="sticky top-16 z-10 py-3 flex flex-wrap items-center gap-3 bg-zinc-100/50 dark:bg-slate-900/50 backdrop-blur-xs">
          <h1 class="text-3xl font-semibold leading-tight tracking-tight">{{ doc.title }}</h1>
          <span v-if="doc.status" class="group/status relative inline-flex">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold focus-visible:outline-indigo-600"
              :class="statusClass" tabindex="0" aria-describedby="status-tooltip">
              <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />{{ statusLabel }}
            </span>
            <span id="status-tooltip" role="tooltip"
              class="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-md bg-zinc-800 px-3 py-2 text-xs font-normal leading-5 text-zinc-50 opacity-0 transition-opacity duration-150 group-hover/status:opacity-100 group-focus-within/status:opacity-100 dark:bg-slate-200 dark:text-slate-900">{{ statusDescription }}</span>
          </span>
        </div>
        <p class="max-w-prose text-sm leading-relaxed text-zinc-600 dark:text-slate-300">{{ doc.summary }}</p>

        <div
          class="mt-8 flex min-w-0 items-center overflow-hidden rounded-md border border-zinc-300 bg-zinc-50 font-mono text-sm dark:border-slate-700 dark:bg-slate-950">
          <span class="self-stretch px-3 py-3 text-xs font-bold leading-5" :class="methodClass">{{ doc.method }}</span>
          <code class="overflow-x-auto px-3 py-3">{{ doc.path }}</code>
        </div>

        <div v-if="doc.notes?.length"
          class="mt-6 rounded-md border border-zinc-300 bg-indigo-100 px-4 py-3 dark:border-slate-700 dark:bg-indigo-900/50">
          <DocsNote v-for="note in doc.notes" :key="note" :note="note" />
        </div>

        <DocsFieldTable v-if="doc.parameters?.length" class="mt-12" title="Parameters" :fields="doc.parameters" />
        <DocsFieldTable v-if="doc.requestFields?.length" class="mt-12" title="Request body"
          :fields="doc.requestFields" />

        <section class="mt-12" aria-labelledby="response-title">
          <h2 id="response-title" class="text-xl font-semibold tracking-tight">Response</h2>
          <DocsFieldTable class="mt-4" title="" :fields="doc.responseFields" />
          <h3 class="mt-8 text-sm font-semibold">Example</h3>
          <pre
            class="mt-3 max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-200"><code>{{ JSON.stringify(doc.responseExample, null, 2) }}</code></pre>
        </section>
      </article>

      <ClientOnly>
        <EndpointTester :doc="doc" />
        <template #fallback>
          <div class="min-h-80 rounded-xl border border-zinc-300 bg-zinc-50 dark:border-slate-700 dark:bg-slate-950"
            aria-hidden="true" />
        </template>
      </ClientOnly>
    </div>
  </main>
  <main v-else class="mx-auto max-w-3xl px-5 py-20 text-center">
    <p class="text-sm font-semibold text-indigo-800 dark:text-indigo-200">404</p>
    <h1 class="mt-3 text-3xl font-semibold leading-tight tracking-tight">Documentation page not found</h1>
    <NuxtLink to="/docs"
      class="mt-6 inline-flex min-h-10 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-zinc-50 hover:bg-indigo-700 focus-visible:outline-indigo-600">
      Back to documentation</NuxtLink>
  </main>
</template>

<script setup lang="ts">
import { getEndpointDoc } from '~/data/apiDocs'

definePageMeta({ layout: 'docs' })

const route = useRoute()
const slug = computed(() => Array.isArray(route.params.slug) ? route.params.slug.join('/') : String(route.params.slug ?? ''))
const doc = computed(() => getEndpointDoc(slug.value))
const statusLabel = computed(() => ({ live: 'Live', stub: 'Stub', upstream: 'Third party' })[doc.value?.status ?? 'live'])
const statusDescription = computed(() => ({
  live: 'Implemented and served directly by BlueHouse.',
  stub: 'The contract is documented, but the endpoint currently returns placeholder data.',
  upstream: 'Provided by Ámbito and called directly from the request tester.',
})[doc.value?.status ?? 'live'])
const statusClass = computed(() => ({
  live: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  stub: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  upstream: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
})[doc.value?.status ?? 'live'])
const methodClass = computed(() => doc.value?.method === 'POST'
  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300')
useHead(() => ({ title: doc.value ? `${doc.value.title} | BlueHouse Docs` : 'Not found | BlueHouse Docs' }))
</script>
