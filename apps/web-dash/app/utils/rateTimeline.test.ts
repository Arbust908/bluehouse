import { describe, expect, test } from 'bun:test';
import { buildRateTimeline, type TimelineRateObservation } from './rateTimeline';

describe('buildRateTimeline', () => {
  test('carries the latest casa values into staggered observations', () => {
    const observations: TimelineRateObservation[] = [
      { casa: 'oficial', buy: '100', sell: '120', observedAt: '2026-07-29T12:00:00Z' },
      { casa: 'blue', buy: '140', sell: '160', observedAt: '2026-07-29T12:00:00Z' },
      { casa: 'blue', buy: '150', sell: '170', observedAt: '2026-07-29T13:00:00Z' },
      { casa: 'bolsa', buy: '130', sell: '150', observedAt: '2026-07-29T14:00:00Z' },
    ]

    expect(buildRateTimeline(observations)).toEqual([
      {
        timestamp: Date.parse('2026-07-29T12:00:00Z'),
        oficial: 110,
        blue: 150,
      },
      {
        timestamp: Date.parse('2026-07-29T13:00:00Z'),
        oficial: 110,
        blue: 160,
      },
      {
        timestamp: Date.parse('2026-07-29T14:00:00Z'),
        oficial: 110,
        blue: 160,
        bolsa: 140,
      },
    ])
  })
})
