import { eq } from "drizzle-orm";
import {
  historicalRuns,
  rateObservations,
} from "@bluehouse/shared/db/schema";
import { datesToRangeString, getNextDateRangeFromRangeString, rangeStringToDates } from "@bluehouse/shared/format";
import { db } from "./db";
import { createObservationFingerprint } from "./fingerprint";
import { HOUSE_NAMES, PROVIDER_NAMES, type HouseName } from "@bluehouse/shared/constants";
import { fetchHistory } from "./fetch-history";

type PollDatabase = Pick<typeof db, "insert" | "transaction" | "update" | "select">;

export interface PollResult {
  runId: string;
  received: number;
  inserted: number;
  nextRange?: string;
}

interface HistoricalPollOptions {
  house: HouseName;
  startDate: string; // Format: YYYY-MM-DD
  endDate: string; // Format: YYYY-MM-DD
}

async function pollHistoricalByHouse(
  database: PollDatabase,
  options: HistoricalPollOptions,
): Promise<PollResult> {
  const currentRange = datesToRangeString(options.startDate, options.endDate);
  const nextRange = getNextDateRangeFromRangeString(currentRange, "backward");

  const pollValues = {
    status: "running" as const,
    house: options.house,
    rangePolled: currentRange,
    nextRange: nextRange,
  }


  const [run] = await database
    .insert(historicalRuns)
    .values(pollValues)
    .returning({ id: historicalRuns.id });

  if (!run) {
    throw new Error("Failed to create poll run");
  }

  try {
    const historicalRates = await fetchHistory(
      options.house,
      options.startDate,
      options.endDate,
    );
    const inserted = await database.transaction((tx) =>
      tx
        .insert(rateObservations)
        .values(
          historicalRates.map((rate) => ({
            pollRunId: run.id,
            provider: PROVIDER_NAMES.AMBITO,
            currency: rate.moneda,
            casa: rate.casa,
            name: rate.nombre,
            sourceFingerprint: createObservationFingerprint(rate),
            buy: rate.compra?.toString() ?? null,
            sell: rate.venta?.toString() ?? null,
            upstreamUpdatedAt: new Date(rate.fechaActualizacion),
          })),
        )
        .onConflictDoNothing({
          target: rateObservations.sourceFingerprint,
        })
        .returning({ id: rateObservations.id }),
    );

    await database
      .update(historicalRuns)
      .set({
        status: "success",
        completedAt: new Date(),
        rowsReceived: historicalRates.length,
        rowsInserted: inserted.length,
      })
      .where(eq(historicalRuns.id, run.id));

    return {
      runId: run.id,
      received: historicalRates.length,
      inserted: inserted.length,
      nextRange: nextRange,
    };

  } catch (error) {
    await database
      .update(historicalRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : "Unknown polling error",
      })
      .where(eq(historicalRuns.id, run.id));

    throw error;
  }
}

export async function getLastPolledRangeByHouse(database: PollDatabase = db, house: HouseName): Promise<string | null> {
  const lastRun = await database
    .select()
    .from(historicalRuns)
    .where(eq(historicalRuns.house, house))
    .orderBy(historicalRuns.completedAt, "desc")
    .limit(1);
  return lastRun.length > 0 && lastRun[0] ? lastRun[0].nextRange : null;
}

export async function pollHistorical(database: PollDatabase = db): Promise<PollResult[]> {
  const results: PollResult[] = [];

  for (const house of Object.values(HOUSE_NAMES)) {
    try {
      let lastRange = await getLastPolledRangeByHouse(database, house);
      if (!lastRange) {
        console.log(`No previous poll found for house ${house}. Skipping.`);
        const today = new Date();
        const startDate = today.setMonth(today.getMonth() - 1);
        const endDate = today.setMonth(today.getMonth() - 2);

      }

      const { startDate, endDate } = rangeStringToDates(lastRange);

      console.log(`Polling historical data for house ${house} from ${startDate} to ${endDate}...`);
      const rates = await pollHistoricalByHouse(database, {
        house,
        startDate,
        endDate,
      });
      results.push(rates);
    } catch (error) {
      console.error(`Failed to poll historical data for house ${house}:`, error);
    }
  }
  return results;
}
