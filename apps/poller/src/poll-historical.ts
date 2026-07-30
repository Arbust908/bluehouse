import { and, desc, eq } from "drizzle-orm";
import {
  HOUSE_NAMES,
  POLL_STATUS,
  PROVIDER_NAMES,
  type HouseName,
} from "@bluehouse/shared/constants";
import { pollRuns, rateObservations } from "@bluehouse/shared/db/schema";
import type { DateRange } from "@bluehouse/shared/format";
import { db } from "./db";
import { fetchHistory } from "./fetch-history";
import { createObservationFingerprint } from "./fingerprint";
import { getHistoricalRange } from "./historical-range";

type PollDatabase = Pick<
  typeof db,
  "insert" | "transaction" | "update" | "select"
>;

export interface HistoricalPollResult extends DateRange {
  runId: string;
  house: HouseName;
  received: number;
  inserted: number;
}

interface HistoricalPollOptions extends DateRange {
  house: HouseName;
}

async function pollHistoricalByHouse(
  database: PollDatabase,
  options: HistoricalPollOptions,
): Promise<HistoricalPollResult> {
  const [run] = await database
    .insert(pollRuns)
    .values({
      runType: "historical",
      status: POLL_STATUS.RUNNING,
      house: options.house,
      pollStart: options.startDate,
      pollEnd: options.endDate,
    })
    .returning({ id: pollRuns.id });

  if (!run) throw new Error("Failed to create historical poll run");

  try {
    const historicalRates = await fetchHistory(
      options.house,
      options.startDate,
      options.endDate,
    );

    const insertedCount = await database.transaction(async (tx) => {
      let inserted: { id: string }[] = [];
      if (historicalRates.length > 0) {
        inserted = await tx
          .insert(rateObservations)
          .values(
            historicalRates.map((rate) => ({
              pollRunId: run.id,
              provider: PROVIDER_NAMES.AMBITO,
              currency: rate.moneda,
              casa: rate.casa,
              name: rate.nombre,
              sourceFingerprint: createObservationFingerprint(
                PROVIDER_NAMES.AMBITO,
                rate,
              ),
              buy: rate.compra?.toString() ?? null,
              sell: rate.venta?.toString() ?? null,
              upstreamUpdatedAt: new Date(rate.fechaActualizacion),
            })),
          )
          .onConflictDoNothing({
            target: rateObservations.sourceFingerprint,
          })
          .returning({ id: rateObservations.id });
      }

      await tx
        .update(pollRuns)
        .set({
          status: POLL_STATUS.SUCCESS,
          completedAt: new Date(),
          rowsReceived: historicalRates.length,
          rowsInserted: inserted.length,
        })
        .where(eq(pollRuns.id, run.id));

      return inserted.length;
    });

    return {
      runId: run.id,
      house: options.house,
      startDate: options.startDate,
      endDate: options.endDate,
      received: historicalRates.length,
      inserted: insertedCount,
    };
  } catch (error) {
    await database
      .update(pollRuns)
      .set({
        status: POLL_STATUS.FAILED,
        completedAt: new Date(),
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : "Unknown polling error",
      })
      .where(eq(pollRuns.id, run.id));

    throw error;
  }
}

export async function getNextHistoricalRangeByHouse(
  database: PollDatabase,
  house: HouseName,
  now: Date = new Date(),
): Promise<DateRange | null> {
  const [lastSuccessfulRun] = await database
    .select({ pollStart: pollRuns.pollStart })
    .from(pollRuns)
    .where(
      and(
        eq(pollRuns.runType, "historical"),
        eq(pollRuns.house, house),
        eq(pollRuns.status, POLL_STATUS.SUCCESS),
      ),
    )
    .orderBy(desc(pollRuns.completedAt), desc(pollRuns.startedAt))
    .limit(1);

  return getHistoricalRange(lastSuccessfulRun?.pollStart ?? null, now);
}

export async function pollHistorical(
  database: PollDatabase = db,
): Promise<HistoricalPollResult[]> {
  const results: HistoricalPollResult[] = [];
  const failures: unknown[] = [];

  for (const house of Object.values(HOUSE_NAMES)) {
    try {
      const range = await getNextHistoricalRangeByHouse(database, house);
      if (!range) {
        console.info(`Historical polling complete for house ${house}`);
        continue;
      }

      console.info(
        `Polling historical data for house ${house} from ${range.startDate} to ${range.endDate}`,
      );
      results.push(
        await pollHistoricalByHouse(database, { house, ...range }),
      );
    } catch (error) {
      failures.push(error);
      console.error(`Failed to poll historical data for house ${house}:`, error);
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `Historical polling failed for ${failures.length} house(s)`,
    );
  }

  return results;
}
