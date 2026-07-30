CREATE TYPE "poll_run_type" AS ENUM('live', 'historical');--> statement-breakpoint
ALTER TABLE "poll_runs" ADD COLUMN "run_type" "poll_run_type" DEFAULT 'live'::"poll_run_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "poll_runs" ADD COLUMN "house" "casa";--> statement-breakpoint
ALTER TABLE "poll_runs" ADD COLUMN "poll_start" date;--> statement-breakpoint
ALTER TABLE "poll_runs" ADD COLUMN "poll_end" date;--> statement-breakpoint
CREATE INDEX "poll_runs_historical_checkpoint_idx" ON "poll_runs" ("run_type","house","status","completed_at");--> statement-breakpoint
ALTER TABLE "poll_runs" ADD CONSTRAINT "poll_runs_type_fields_check" CHECK (("run_type" = 'live' AND "house" IS NULL AND "poll_start" IS NULL AND "poll_end" IS NULL) OR ("run_type" = 'historical' AND "house" IS NOT NULL AND "poll_start" IS NOT NULL AND "poll_end" IS NOT NULL AND "poll_start" <= "poll_end"));