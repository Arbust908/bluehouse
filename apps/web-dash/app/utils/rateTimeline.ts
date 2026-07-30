import type { HouseName } from '@bluehouse/shared/domain';

export interface TimelineRateObservation {
  casa: HouseName;
  buy: string | null;
  sell: string | null;
  upstreamUpdatedAt: Date | string;
}

export function buildRateTimeline(observations: readonly TimelineRateObservation[]) {
  const changesByTimestamp = new Map<number, Map<HouseName, number>>()

  for (const rate of observations) {
    if (rate.buy === null || rate.sell === null) continue

    const buy = Number(rate.buy)
    const sell = Number(rate.sell)
    const timestamp = new Date(rate.upstreamUpdatedAt).getTime()
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || !Number.isFinite(timestamp)) continue

    const changes = changesByTimestamp.get(timestamp) ?? new Map<HouseName, number>()
    changes.set(rate.casa, (buy + sell) / 2)
    changesByTimestamp.set(timestamp, changes)
  }

  const latestRates = new Map<HouseName, number>()
  return [...changesByTimestamp.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, changes]) => {
      for (const [casa, value] of changes) latestRates.set(casa, value)
      return Object.fromEntries([['timestamp', timestamp], ...latestRates.entries()]) as Record<string, number>
    })
}
