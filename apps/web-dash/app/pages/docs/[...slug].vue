<template>
  <main v-if="doc" class="mx-auto max-w-[96rem] px-5 py-10 sm:px-8 lg:py-14">
    <div class="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.82fr)]">
      <article class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-muted)">{{ doc.group }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <h1 class="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{{ doc.title }}</h1>
          <span v-if="doc.status" class="rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold" :class="statusClass">{{ statusLabel }}</span>
        </div>
        <p class="mt-4 max-w-[70ch] text-base leading-7 text-(--color-muted)">{{ doc.summary }}</p>

        <div class="mt-8 flex min-w-0 items-center overflow-hidden rounded-md border border-(--color-rule) bg-(--color-surface) font-mono text-sm">
          <span class="self-stretch px-3 py-3 text-xs font-bold leading-5" :class="doc.method === 'POST' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'">{{ doc.method }}</span>
          <code class="overflow-x-auto px-3 py-3">{{ doc.path }}</code>
        </div>

        <div v-if="doc.notes?.length" class="mt-6 rounded-md border border-(--color-rule) bg-(--color-accent-soft) px-4 py-3">
          <p v-for="note in doc.notes" :key="note" class="text-sm leading-6 text-(--color-ink)">{{ note }}</p>
        </div>

        <DocsFieldTable v-if="doc.parameters?.length" class="mt-12" title="Parameters" :fields="doc.parameters" />
        <DocsFieldTable v-if="doc.requestFields?.length" class="mt-12" title="Request body" :fields="doc.requestFields" />

        <section class="mt-12" aria-labelledby="response-title">
          <h2 id="response-title" class="text-xl font-semibold tracking-[-0.025em]">Response</h2>
          <DocsFieldTable class="mt-4" title="" :fields="doc.responseFields" />
          <h3 class="mt-8 text-sm font-semibold">Example</h3>
          <pre class="mt-3 max-h-96 overflow-auto rounded-md bg-zinc-900 p-4 text-xs leading-5 text-zinc-100"><code>{{ JSON.stringify(doc.responseExample, null, 2) }}</code></pre>
        </section>
      </article>

      <EndpointTester :doc="doc" />
    </div>
  </main>
  <main v-else class="mx-auto max-w-3xl px-5 py-20 text-center">
    <p class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">404</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.04em]">Documentation page not found</h1>
    <NuxtLink to="/docs" class="mt-6 inline-flex min-h-10 items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white">Back to documentation</NuxtLink>
  </main>
</template>

<script setup lang="ts">
import { getEndpointDoc } from '~/data/apiDocs'

definePageMeta({ layout: 'docs' })

const route = useRoute()
const slug = computed(() => Array.isArray(route.params.slug) ? route.params.slug.join('/') : String(route.params.slug ?? ''))
const doc = computed(() => getEndpointDoc(slug.value))
const statusLabel = computed(() => ({ live: 'Live', stub: 'Stub', upstream: 'Third party' })[doc.value?.status ?? 'live'])
const statusClass = computed(() => doc.value?.status === 'stub'
  ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
  : doc.value?.status === 'upstream'
    ? 'bg-sky-500/10 text-sky-800 dark:text-sky-300'
    : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300')

useHead(() => ({ title: doc.value ? `${doc.value.title} | BlueHouse Docs` : 'Not found | BlueHouse Docs' }))
</script>
