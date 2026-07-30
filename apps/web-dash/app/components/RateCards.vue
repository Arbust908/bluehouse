<template>
  <div v-if="rateCards.length" class="space-y-5">
    <div class="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] md:items-center">
      <RatesFeatureCard v-for="card in primaryRates" :key="card.casa" :title="card.title" :value="card.value"
        :buy="card.buy" :sell="card.sell" class="col-span-2" />
      <RatesRegularCard v-for="card in secondaryRates" :key="card.casa" :title="card.title" :value="card.value"
        :buy="card.buy" :sell="card.sell" />
    </div>
  </div>
  <p v-else class="border-y border-zinc-300 dark:border-slate-700 py-8 text-sm text-zinc-500 dark:text-slate-500">
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
