<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shadow">
    <StatBox v-for="card in rateCards" :key="card.title" :title="card.title" :value="`$${card.value.toFixed(2)}`"
      :description="card.description" />
  </div>
</template>

<script setup lang="ts">
import type { RateObservation, CasaTypes } from '@bluehouse/shared/db/schema';

interface Props {
  rates: RateObservation[];
}
interface RateCard {
  title: CasaTypes;
  value: number;
  description: string;
}

const props = defineProps<Props>()

const rateObservations = toRef(props.rates)
const rateCards = computed(() => {
  const cards: RateCard[] = []
  rateObservations.value.forEach((rate) => {
    console.log('Rate:', rate)
    const sellValue = Number(rate.sell)
    const buyValue = Number(rate.buy)
    if (isNaN(sellValue) || isNaN(buyValue)) {
      console.warn(`Invalid rate values for ${rate.casa}: buy=${rate.buy}, sell=${rate.sell}`)
      return
    }
    const averageRate = (sellValue + buyValue) / 2

    const card: RateCard = {
      title: rate.casa,
      value: averageRate, // Average of buy and sell rates
      description: `Last updated: ${new Date(rate.observedAt).toLocaleString()}`,
    }
    cards.push(card)
  })
  return cards
})
</script>