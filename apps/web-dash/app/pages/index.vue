<template>
  <main class="mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8 sm:pt-14">
    <div v-if="error" role="alert" class="mb-8 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm">
      No pudimos cargar las cotizaciones. Intentá nuevamente en unos minutos.
    </div>

    <section aria-labelledby="page-title">
      <div class="mb-7 max-w-2xl">
        <p class="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-accent)]">Cotización en pesos</p>
        <h1 id="page-title" class="text-3xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-4xl">
          El dólar, sin ruido.
        </h1>
        <p class="mt-3 max-w-xl text-sm text-[var(--color-muted)] sm:text-base">
          Valores de compra, venta y promedio para las principales cotizaciones de Argentina.
        </p>
      </div>
      <RunsHeader :runs="runs" />
    </section>

    <section class="mt-12 sm:mt-16" aria-labelledby="current-rates-title">
      <div class="mb-5 flex items-end justify-between gap-5">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Ahora</p>
          <h2 id="current-rates-title" class="mt-1 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Cotizaciones</h2>
        </div>
        <p class="hidden text-xs text-[var(--color-muted)] sm:block">Promedio entre compra y venta</p>
      </div>
      <RateCards :rates="rates" />
    </section>

    <section class="mt-14 sm:mt-20" aria-labelledby="history-title">
      <div class="mb-5">
        <p class="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Historia</p>
        <h2 id="history-title" class="mt-1 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">Evolución de cotizaciones</h2>
        <p class="mt-2 text-sm text-[var(--color-muted)]">Cada cambio observado, manteniendo el último valor conocido de las demás cotizaciones.</p>
      </div>
      <div v-if="chartData.length" class="border-y border-[var(--color-rule)] py-5 sm:py-7">
        <ul class="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-muted)]" aria-label="Series del gráfico">
          <li v-for="item in chartLegend" :key="item.name" class="flex items-center gap-1.5">
            <span class="size-2 rounded-full" :style="{ backgroundColor: item.color }" />
            {{ item.name }}
          </li>
        </ul>
        <LineChart :data="chartData" :categories="chartCategories" :height="360" :x-formatter="xFormatter"
          :y-formatter="yFormatter" :x-num-ticks="Math.min(chartData.length, 6)" :y-num-ticks="5"
          :y-grid-line="true" :line-width="2" :duration="180" :hide-legend="true" />
      </div>
      <p v-else class="border-y border-[var(--color-rule)] py-8 text-sm text-[var(--color-muted)]">
        El historial aparecerá cuando haya cotizaciones registradas.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { buildRateTimeline } from '~/utils/rateTimeline';

useHead({
  title: 'Cotizaciones del dólar | BlueHouse',
  meta: [
    {
      name: 'description',
      content: 'Cotizaciones actualizadas del dólar oficial, blue y otros mercados de Argentina.',
    },
  ],
})

const { data, error } = await useAsyncData('fullData', () => $fetch('/api'))
const runs = computed(() => data.value?.pollRuns || [])
const rates = computed(() => data.value?.rateObservations || [])

const chartCategories = {
  oficial: { name: 'Oficial', color: 'oklch(58% 0.18 285)' },
  blue: { name: 'Blue', color: 'oklch(56% 0.13 250)' },
  bolsa: { name: 'Bolsa', color: 'oklch(58% 0.10 175)' },
  contadoconliqui: { name: 'Contado con liquidación', color: 'oklch(57% 0.12 310)' },
  mayorista: { name: 'Mayorista', color: 'oklch(66% 0.11 95)' },
  cripto: { name: 'Cripto', color: 'oklch(54% 0.08 215)' },
  tarjeta: { name: 'Tarjeta', color: 'oklch(58% 0.13 20)' },
}
const chartLegend = Object.values(chartCategories)

const axisDateFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const axisCurrencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

const chartData = computed(() => buildRateTimeline(rates.value))

const xFormatter = (index: number) => {
  const timestamp = chartData.value[index]?.timestamp
  return typeof timestamp === 'number' ? axisDateFormatter.format(timestamp) : ''
}
const yFormatter = (value: number) => axisCurrencyFormatter.format(value)
</script>
