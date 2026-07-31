<template>
  <section class="overflow-hidden rounded-lg border border-(--color-rule) bg-(--color-surface) lg:sticky lg:top-6" aria-labelledby="tester-title">
    <div class="flex items-center justify-between border-b border-(--color-rule) px-4 py-3">
      <div>
        <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-(--color-muted)">Live request</p>
        <h2 id="tester-title" class="mt-0.5 text-sm font-semibold">Try this endpoint</h2>
      </div>
      <button type="button" class="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="loading" @click="runRequest">
        <PhPlay :size="14" weight="fill" />
        {{ loading ? 'Running' : 'Send' }}
      </button>
    </div>

    <div v-if="doc.parameters?.length" class="grid gap-3 border-b border-(--color-rule) p-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <label v-for="parameter in doc.parameters" :key="parameter.name" class="block text-xs font-medium">
        {{ parameter.name }}
        <input v-model="parameterValues[parameter.name]" :type="parameter.name.toLowerCase().includes('date') ? 'date' : 'text'" class="mt-1.5 min-h-10 w-full rounded-md border border-(--color-rule) bg-(--color-paper) px-3 text-sm outline-none focus:border-indigo-500" />
      </label>
    </div>

    <div v-if="doc.method === 'POST'" class="border-b border-(--color-rule) p-4">
      <label for="request-body" class="text-xs font-medium">JSON body</label>
      <textarea id="request-body" v-model="requestBody" spellcheck="false" rows="10" class="mt-1.5 w-full resize-y rounded-md border border-(--color-rule) bg-(--color-paper) p-3 font-mono text-xs leading-5 outline-none focus:border-indigo-500" />
    </div>

    <div class="border-b border-(--color-rule)">
      <div class="flex overflow-x-auto px-2 pt-2" role="tablist" aria-label="Code example language">
        <button v-for="language in languages" :key="language" type="button" role="tab" :aria-selected="selectedLanguage === language" class="min-h-9 px-3 text-xs font-medium text-(--color-muted) hover:text-(--color-ink)" :class="{ 'border-b-2 border-indigo-600 text-(--color-ink)': selectedLanguage === language }" @click="selectedLanguage = language">{{ language }}</button>
      </div>
      <div class="relative bg-zinc-900 p-4 text-zinc-100">
        <button type="button" class="absolute right-2 top-2 grid size-8 place-items-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" :aria-label="copied ? 'Copied' : 'Copy code'" @click="copyCode">
          <PhCheck v-if="copied" :size="15" />
          <PhCopy v-else :size="15" />
        </button>
        <pre class="max-h-64 overflow-auto pr-7 text-xs leading-5"><code>{{ codeExample }}</code></pre>
      </div>
    </div>

    <div aria-live="polite">
      <div class="flex items-center justify-between px-4 py-3 text-xs">
        <span class="font-semibold">Response</span>
        <span v-if="responseStatus" class="numeric text-(--color-muted)">{{ responseStatus }} · {{ responseTime }} ms</span>
      </div>
      <pre class="max-h-[28rem] min-h-36 overflow-auto border-t border-(--color-rule) bg-(--color-paper) p-4 text-xs leading-5"><code>{{ responseText }}</code></pre>
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

const formatAmbitoDate = (value: string) => value.split('-').reverse().join('-')

const endpoint = computed(() => {
  let path = props.doc.path
  for (const [name, rawValue] of Object.entries(parameterValues)) {
    const value = props.doc.ambitoHouse && name.toLowerCase().includes('date') ? formatAmbitoDate(rawValue) : rawValue
    path = path.replace(`{${name}}`, encodeURIComponent(value))
  }
  if (props.doc.ambitoHouse === 'bolsa' || props.doc.ambitoHouse === 'contadoconliqui') {
    const start = formatAmbitoDate(parameterValues.startDate ?? '')
    const end = formatAmbitoDate(parameterValues.endDate ?? '')
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
