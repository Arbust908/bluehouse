import type { CasaTypes } from '@bluehouse/shared/db/schema';

export interface TimelineRateObservation {
  casa: CasaTypes;
  buy: string | null;
  sell: string | null;
  observedAt: Date | string;
}

export function buildRateTimeline(observations: readonly TimelineRateObservation[]) {
  const changesByTimestamp = new Map<number, Map<CasaTypes, number>>()

  for (const rate of observations) {
    if (rate.buy === null || rate.sell === null) continue

    const buy = Number(rate.buy)
    const sell = Number(rate.sell)
    const timestamp = new Date(rate.observedAt).getTime()
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || !Number.isFinite(timestamp)) continue

    const changes = changesByTimestamp.get(timestamp) ?? new Map<CasaTypes, number>()
    changes.set(rate.casa, (buy + sell) / 2)
    changesByTimestamp.set(timestamp, changes)
  }

  const latestRates = new Map<CasaTypes, number>()
  return [...changesByTimestamp.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, changes]) => {
      for (const [casa, value] of changes) latestRates.set(casa, value)
      return Object.fromEntries([['timestamp', timestamp], ...latestRates.entries()]) as Record<string, number>
    })
}
