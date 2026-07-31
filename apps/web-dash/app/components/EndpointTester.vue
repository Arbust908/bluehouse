<template>
  <section class="overflow-hidden rounded-xl border border-zinc-300 bg-zinc-50 dark:border-slate-700 dark:bg-slate-950 lg:sticky lg:top-6" aria-labelledby="tester-title">
    <div class="flex items-center justify-between border-b border-zinc-300 px-4 py-3 dark:border-slate-700">
      <div>
        <p class="text-[0.6875rem] font-[650] uppercase tracking-[0.08em] text-zinc-500 dark:text-slate-500">Live request</p>
        <h2 id="tester-title" class="mt-0.5 text-sm font-[650]">Try this endpoint</h2>
      </div>
      <button type="button" class="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-[650] text-zinc-50 hover:bg-indigo-700 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60" :disabled="loading" @click="runRequest">
        <PhPlay :size="14" weight="fill" />
        {{ loading ? 'Running' : 'Send' }}
      </button>
    </div>

    <div v-if="doc.parameters?.length" class="grid gap-3 border-b border-zinc-300 p-4 dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <label v-for="parameter in doc.parameters" :key="parameter.name" class="block text-xs font-medium">
        {{ parameter.name }}
        <input v-model="parameterValues[parameter.name]" :type="parameter.name.toLowerCase().includes('date') && !doc.ambitoHouse ? 'date' : 'text'" class="mt-1.5 min-h-10 w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 text-sm outline-none focus:border-indigo-600 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-900" />
      </label>
    </div>

    <div v-if="doc.method === 'POST'" class="border-b border-zinc-300 p-4 dark:border-slate-700">
      <label for="request-body" class="text-xs font-medium">JSON body</label>
      <textarea id="request-body" v-model="requestBody" spellcheck="false" rows="10" class="mt-1.5 w-full resize-y rounded-md border border-zinc-300 bg-zinc-100 p-3 font-mono text-xs leading-5 outline-none focus:border-indigo-600 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-900" />
    </div>

    <div class="border-b border-zinc-300 dark:border-slate-700">
      <div class="flex overflow-x-auto px-2 pt-2" role="tablist" aria-label="Code example language">
        <button v-for="language in languages" :key="language" type="button" role="tab" :aria-selected="selectedLanguage === language" class="min-h-10 border-b border-transparent px-3 text-xs font-medium text-zinc-500 hover:text-zinc-800 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:text-slate-200" :class="{ 'border-indigo-600 text-zinc-800 dark:text-slate-200': selectedLanguage === language }" @click="selectedLanguage = language">{{ language }}</button>
      </div>
      <div class="relative bg-slate-950 p-4 text-slate-200">
        <button type="button" class="absolute right-2 top-2 grid size-10 place-items-center rounded-md text-slate-500 hover:bg-slate-900 hover:text-slate-200 focus-visible:outline-indigo-600" :aria-label="copied ? 'Copied' : 'Copy code'" @click="copyCode">
          <PhCheck v-if="copied" :size="15" />
          <PhCopy v-else :size="15" />
        </button>
        <pre class="max-h-64 overflow-auto pr-7 text-xs leading-5"><code>{{ codeExample }}</code></pre>
      </div>
    </div>

    <div aria-live="polite">
      <div class="flex items-center justify-between px-4 py-3 text-xs">
        <span class="font-[650]">Response</span>
        <span v-if="responseStatus" class="numeric text-zinc-500 dark:text-slate-500">{{ responseStatus }} · {{ responseTime }} ms</span>
      </div>
      <pre class="max-h-[28rem] min-h-36 overflow-auto border-t border-zinc-300 bg-zinc-100 p-4 text-xs leading-5 dark:border-slate-700 dark:bg-slate-900"><code>{{ responseText }}</code></pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PhCheck, PhCopy, PhPlay } from '@phosphor-icons/vue'
import type { EndpointDoc } from '~/data/apiDocs'

const props = defineProps<{ doc: EndpointDoc }>()
const languages = ['cURL', 'Node', 'PHP', 'Python'] as const
type Language = typeof languages[number]

const selectedLanguage = ref<Language>('cURL')
const requestBody = ref(props.doc.defaultBody ?? '')
const loading = ref(false)
const copied = ref(false)
const responseStatus = ref<number>()
const responseTime = ref(0)
const responseText = ref('Send a request to inspect the current response.')
const parameterValues = reactive(Object.fromEntries((props.doc.parameters ?? []).map(parameter => [parameter.name, parameter.defaultValue])))
const requestUrl = useRequestURL()

const endpoint = computed(() => {
  let path = props.doc.path
  for (const [name, rawValue] of Object.entries(parameterValues)) {
    path = path.replace(`{${name}}`, encodeURIComponent(rawValue))
  }
  if (props.doc.ambitoHouse === 'bolsa' || props.doc.ambitoHouse === 'contadoconliqui') {
    const start = parameterValues.startDate ?? ''
    const end = parameterValues.endDate ?? ''
    path = path.replace(`${encodeURIComponent(start)}/${encodeURIComponent(end)}`, `${encodeURIComponent(end)}/${encodeURIComponent(start)}`)
  }
  return path
})

const absoluteEndpoint = computed(() => {
  if (/^https?:\/\//.test(endpoint.value)) return endpoint.value
  return new URL(endpoint.value, requestUrl.origin).toString()
})

const codeExample = computed(() => {
  const url = absoluteEndpoint.value
  const body = requestBody.value || '{}'
  if (selectedLanguage.value === 'Node') return props.doc.method === 'POST'
    ? `const response = await fetch('${url}', {\n  method: 'POST',\n  headers: { 'content-type': 'application/json' },\n  body: JSON.stringify(${body}),\n});\n\nconsole.log(await response.json());`
    : `const response = await fetch('${url}');\nconsole.log(await response.json());`
  if (selectedLanguage.value === 'PHP') return props.doc.method === 'POST'
    ? `$body = <<<'JSON'\n${body}\nJSON;\n\n$response = file_get_contents('${url}', false, stream_context_create([\n  'http' => [\n    'method' => 'POST',\n    'header' => "Content-Type: application/json\\r\\n",\n    'content' => $body,\n  ],\n]));\n\necho $response;`
    : `$response = file_get_contents('${url}');\necho $response;`
  if (selectedLanguage.value === 'Python') return props.doc.method === 'POST'
    ? `import json\nimport requests\n\nbody = json.loads(r'''${body}''')\nresponse = requests.post('${url}', json=body)\nprint(response.json())`
    : `import requests\n\nresponse = requests.get('${url}')\nprint(response.json())`
  return props.doc.method === 'POST'
    ? `curl '${url}' \\\n  --request POST \\\n  --header 'content-type: application/json' \\\n  --data '${body.replaceAll("'", "'\\''")}'`
    : `curl '${url}'`
})

async function runRequest() {
  loading.value = true
  responseStatus.value = undefined
  const startedAt = performance.now()
  try {
    const body = props.doc.method === 'POST' ? JSON.parse(requestBody.value) : undefined
    const response = await fetch(endpoint.value, {
      method: props.doc.method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    responseStatus.value = response.status
    const text = await response.text()
    try {
      responseText.value = JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      responseText.value = text || '<empty response>'
    }
  } catch (error) {
    responseText.value = error instanceof Error ? error.message : String(error)
  } finally {
    responseTime.value = Math.round(performance.now() - startedAt)
    loading.value = false
  }
}

async function copyCode() {
  await navigator.clipboard.writeText(codeExample.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}
</script>
