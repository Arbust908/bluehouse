<template>
  <div v-if="rateCards.length" class="space-y-5">
    <div class="grid gap-3 md:grid-cols-2">
      <article v-for="card in primaryRates" :key="card.casa"
        class="rounded-xl border border-[var(--color-rule)] bg-[var(--color-surface)] p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{{ card.title }}</h3>
            <p class="numeric mt-5 text-[clamp(2rem,7vw,3.25rem)] font-semibold leading-none tracking-[-0.055em]">
              {{ card.value }}
            </p>
          </div>
          <span class="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Promedio
          </span>
        </div>
        <dl class="numeric mt-6 flex gap-6 border-t border-[var(--color-rule)] pt-4 text-sm">
          <div>
            <dt class="text-xs text-[var(--color-muted)]">Compra</dt>
            <dd class="mt-0.5 font-semibold">{{ card.buy }}</dd>
          </div>
          <div>
            <dt class="text-xs text-[var(--color-muted)]">Venta</dt>
            <dd class="mt-0.5 font-semibold">{{ card.sell }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <div class="border-y border-[var(--color-rule)]">
      <div class="hidden grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-4 border-b border-[var(--color-rule)] py-2.5 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)] sm:grid">
        <span class="text-left">Tipo</span>
        <span>Promedio</span>
        <span>Compra</span>
        <span>Venta</span>
      </div>
      <article v-for="card in secondaryRates" :key="card.casa"
        class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 border-b border-[var(--color-rule)] py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:gap-4">
        <h3 class="font-semibold tracking-[-0.015em]">{{ card.title }}</h3>
        <p class="numeric text-right text-lg font-semibold tracking-[-0.025em] sm:text-sm">{{ card.value }}</p>
        <dl class="numeric col-span-2 grid grid-cols-2 gap-5 text-sm sm:contents">
          <div class="flex items-baseline justify-between gap-3 sm:block sm:text-right">
            <dt class="text-xs text-[var(--color-muted)] sm:sr-only">Compra</dt>
            <dd>{{ card.buy }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-3 sm:block sm:text-right">
            <dt class="text-xs text-[var(--color-muted)] sm:sr-only">Venta</dt>
            <dd>{{ card.sell }}</dd>
          </div>
        </dl>
      </article>
    </div>
  </div>
  <p v-else class="border-y border-[var(--color-rule)] py-8 text-sm text-[var(--color-muted)]">
    Todavía no hay cotizaciones disponibles.
  </p>
</template>

<script setup lang="ts">
import type { CasaTypes, RateObservation } from '@bluehouse/shared/db/schema';

interface Props {
  rates: RateObservation[];
}
interface RateCard {
  casa: CasaTypes;
  title: string;
  value: string;
  buy: string;
  sell: string;
}

const props = defineProps<Props>()

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const rateCards = computed(() => {
  const latestByCasa = new Map<CasaTypes, RateObservation>()

  for (const rate of props.rates) {
    const current = latestByCasa.get(rate.casa)
    if (!current
      || new Date(String(rate.observedAt)).getTime() > new Date(String(current.observedAt)).getTime()) {
      latestByCasa.set(rate.casa, rate)
    }
  }

  const cards: RateCard[] = []
  for (const rate of latestByCasa.values()) {
    if (rate.sell === null || rate.buy === null) continue

    const sellValue = Number(rate.sell)
    const buyValue = Number(rate.buy)
    if (!Number.isFinite(sellValue) || !Number.isFinite(buyValue)) continue

    const averageRate = (sellValue + buyValue) / 2
    cards.push({
      casa: rate.casa,
      title: rate.name,
      value: currencyFormatter.format(averageRate),
      buy: currencyFormatter.format(buyValue),
      sell: currencyFormatter.format(sellValue),
    })
  }

  const order: CasaTypes[] = ['oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta']
  return cards.sort((a, b) => order.indexOf(a.casa) - order.indexOf(b.casa))
})

const primaryRates = computed(() => rateCards.value.filter(rate => rate.casa === 'oficial' || rate.casa === 'blue'))
const secondaryRates = computed(() => rateCards.value.filter(rate => rate.casa !== 'oficial' && rate.casa !== 'blue'))
</script>
