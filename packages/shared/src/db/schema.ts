import { sql } from "drizzle-orm/sql/sql";
import {
  bigint,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CURRENCY_NAMES, HOUSE_NAMES } from "../constants";

export const casaEnum = pgEnum("casa", HOUSE_NAMES);

export const currencyEnum = pgEnum("currency", CURRENCY_NAMES);

export const providerEnum = pgEnum("provider", [
  "dolarapi",
  "ambito",
]);

export const pollStatusEnum = pgEnum("poll_status", [
  "running",
  "success",
  "failed",
  "skipped",
]);
export type PollStatus = (typeof pollStatusEnum.enumValues)[number];

// Individual poll runs
export const pollRuns = pgTable("poll_runs", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  status: pollStatusEnum("status").notNull(),
  startedAt: timestamp("started_at", {
    mode: "date",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", {
    mode: "date",
    withTimezone: true,
  }),
  upstreamStatus: bigint("upstream_status", {
    mode: "number",
  }),
  rowsReceived: bigint("rows_received", {
    mode: "number",
  }),
  rowsInserted: bigint("rows_inserted", {
    mode: "number",
  }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
})
// Bulk historical runs
export const historicalRuns = pgTable("historical_runs", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  status: pollStatusEnum("status").notNull(),
  house: casaEnum("house").notNull(),
  rangePolled: text("range_polled").notNull(),
  nextRange: text("next_range").notNull(),

  startedAt: timestamp("started_at", {
    mode: "date",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", {
    mode: "date",
    withTimezone: true,
  }),
  upstreamStatus: bigint("upstream_status", {
    mode: "number",
  }),
  rowsReceived: bigint("rows_received", {
    mode: "number",
  }),
  rowsInserted: bigint("rows_inserted", {
    mode: "number",
  }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});


export const rateObservations = pgTable(
  "rate_observations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    pollRunId: uuid("poll_run_id")
      .notNull()
      .references(() => pollRuns.id),
    currency: currencyEnum("currency")
      .notNull()
      .default("USD"),
    provider: providerEnum("provider").notNull(),
    casa: casaEnum("casa").notNull(),
    name: text("name").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    // Drizzle returns exact PostgreSQL numeric values as strings by default.
    buy: numeric("buy", {
      precision: 14,
      scale: 4,
    }),
    sell: numeric("sell", {
      precision: 14,
      scale: 4,
    }),
    upstreamUpdatedAt: timestamp("upstream_updated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    observedAt: timestamp("observed_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("rate_observations_source_fingerprint_unique").on(
      table.sourceFingerprint,
    ),
    index("rate_observations_casa_observed_at_idx").on(
      table.casa,
      table.observedAt,
    ),
    index("rate_observations_upstream_updated_at_idx").on(
      table.upstreamUpdatedAt,
    ),
  ],
);

export type PollRun = typeof pollRuns.$inferSelect;
export type NewPollRun = typeof pollRuns.$inferInsert;

export type HistoricalRun = typeof historicalRuns.$inferSelect;
export type NewHistoricalRun = typeof historicalRuns.$inferInsert;

export type RateObservation = typeof rateObservations.$inferSelect;
export type NewRateObservation = typeof rateObservations.$inferInsert;
