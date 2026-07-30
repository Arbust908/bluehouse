import { sql } from "drizzle-orm/sql/sql";
import {
  bigint,
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CURRENCY_NAMES, HOUSE_NAMES, POLL_STATUS, PROVIDER_NAMES, RUN_TYPE } from "../constants";

export const casaEnum = pgEnum("casa", HOUSE_NAMES);
export const currencyEnum = pgEnum("currency", CURRENCY_NAMES);
export const providerEnum = pgEnum("provider", PROVIDER_NAMES);
export const pollStatusEnum = pgEnum("poll_status", POLL_STATUS);
export const pollRunTypeEnum = pgEnum("poll_run_type", RUN_TYPE);


export const pollRuns = pgTable(
  "poll_runs",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    runType: pollRunTypeEnum("run_type").notNull().default("live"),
    status: pollStatusEnum("status").notNull(),
    house: casaEnum("house"),
    pollStart: date("poll_start", { mode: "string" }),
    pollEnd: date("poll_end", { mode: "string" }),
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
  },
  (table) => [
    check(
      "poll_runs_type_fields_check",
      sql`(${table.runType} = 'live' AND ${table.house} IS NULL AND ${table.pollStart} IS NULL AND ${table.pollEnd} IS NULL) OR (${table.runType} = 'historical' AND ${table.house} IS NOT NULL AND ${table.pollStart} IS NOT NULL AND ${table.pollEnd} IS NOT NULL AND ${table.pollStart} <= ${table.pollEnd})`,
    ),
    index("poll_runs_historical_checkpoint_idx").on(
      table.runType,
      table.house,
      table.status,
      table.completedAt,
    ),
  ],
);


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

export type RateObservation = typeof rateObservations.$inferSelect;
export type NewRateObservation = typeof rateObservations.$inferInsert;
