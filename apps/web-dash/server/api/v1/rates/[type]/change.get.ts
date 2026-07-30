import { pollRuns, rateObservations } from '@bluehouse/shared/db/schema';
import { useDb } from '~~/server/db/index';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const startTime = Date.now();
  const [pollRunsData, rateObservationsData] = await Promise.all([
    db.select().from(pollRuns),
    db.select().from(rateObservations),
  ])
  const endTime = Date.now();

  return {
    pollRuns: pollRunsData,
    rateObservations: rateObservationsData,
    queryTime: endTime - startTime,
  }
})
