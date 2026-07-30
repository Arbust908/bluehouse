import { desc } from 'drizzle-orm';
import { rateObservations } from '@bluehouse/shared/db/schema';
import { useDb } from '~~/server/db/index';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const startTime = Date.now();
  // We need to get the last polled rate of each house.
  const currentRates = await db
    .selectDistinctOn([rateObservations.casa], {
      currency: rateObservations.currency,
      provider: rateObservations.provider,
      name: rateObservations.casa,
      buy: rateObservations.buy,
      sell: rateObservations.sell,
      createdAt: rateObservations.upstreamUpdatedAt,
    })
    .from(rateObservations)
    .orderBy(rateObservations.casa, desc(rateObservations.observedAt));
  const endTime = Date.now();

  return {
    data: currentRates,
    queryTime: endTime - startTime,
  }
})
