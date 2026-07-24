CREATE TYPE "casa" AS ENUM('oficial', 'blue', 'bolsa', 'contadoconliqui', 'mayorista', 'cripto', 'tarjeta');--> statement-breakpoint
CREATE TYPE "currency" AS ENUM('USD', 'ARS');--> statement-breakpoint
CREATE TYPE "poll_status" AS ENUM('running', 'success', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "provider" AS ENUM('dolarapi', 'ambito');--> statement-breakpoint
CREATE TABLE "poll_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"status" "poll_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"upstream_status" bigint,
	"rows_received" bigint,
	"rows_inserted" bigint,
	"error_code" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "rate_observations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"poll_run_id" uuid NOT NULL,
	"currency" "currency" DEFAULT 'USD'::"currency" NOT NULL,
	"provider" "provider" NOT NULL,
	"casa" "casa" NOT NULL,
	"name" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"buy" numeric(14,4),
	"sell" numeric(14,4),
	"upstream_updated_at" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "rate_observations_source_fingerprint_unique" ON "rate_observations" ("source_fingerprint");--> statement-breakpoint
CREATE INDEX "rate_observations_casa_observed_at_idx" ON "rate_observations" ("casa","observed_at");--> statement-breakpoint
CREATE INDEX "rate_observations_upstream_updated_at_idx" ON "rate_observations" ("upstream_updated_at");--> statement-breakpoint
ALTER TABLE "rate_observations" ADD CONSTRAINT "rate_observations_poll_run_id_poll_runs_id_fkey" FOREIGN KEY ("poll_run_id") REFERENCES "poll_runs"("id");