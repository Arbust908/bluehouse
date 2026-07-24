import { eq } from "drizzle-orm";
import {
  pollRuns,
  rateObservations,
} from "@bluehouse/shared/db/schema";
import { db } from "./db";
import { fetchRates } from "./fetch-rates";
import { createObservationFingerprint } from "./fingerprint";

type PollDatabase = Pick<typeof db, "insert" | "transaction" | "update">;

export interface PollResult {
  runId: string;
  received: number;
  inserted: number;
}

export async function pollRates(database: PollDatabase = db): Promise<PollResult> {
  const [run] = await database
    .insert(pollRuns)
    .values({ status: "running" })
    .returning({ id: pollRuns.id });

  if (!run) {
    throw new Error("Failed to create poll run");
  }

  try {
    const rates = await fetchRates();
    const inserted = await database.transaction((tx) =>
      tx
        .insert(rateObservations)
        .values(
          rates.map((rate) => ({
            pollRunId: run.id,
            provider: "dolarapi" as const,
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
      .update(pollRuns)
      .set({
        status: "success",
        completedAt: new Date(),
        rowsReceived: rates.length,
        rowsInserted: inserted.length,
      })
      .where(eq(pollRuns.id, run.id));

    return {
      runId: run.id,
      received: rates.length,
      inserted: inserted.length,
    };
  } catch (error) {
    await database
      .update(pollRuns)
      .set({
        status: "failed",
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
