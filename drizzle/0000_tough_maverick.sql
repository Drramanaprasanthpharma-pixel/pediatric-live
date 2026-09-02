CREATE TABLE "babies" (
	"id" serial PRIMARY KEY NOT NULL,
	"uhid" text NOT NULL,
	"baby_name" text NOT NULL,
	"mother_name" text DEFAULT '' NOT NULL,
	"bed" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT 'nicu' NOT NULL,
	"subspecialty" text DEFAULT '' NOT NULL,
	"insurance" text DEFAULT '' NOT NULL,
	"insurance_name" text DEFAULT '' NOT NULL,
	"sex" text DEFAULT 'Male' NOT NULL,
	"dob" timestamp with time zone DEFAULT now() NOT NULL,
	"gest_weeks" integer DEFAULT 37 NOT NULL,
	"gest_days" integer DEFAULT 0 NOT NULL,
	"birth_weight" integer DEFAULT 2500 NOT NULL,
	"current_weight" integer DEFAULT 2500 NOT NULL,
	"delivery_mode" text DEFAULT 'LSCS' NOT NULL,
	"apgar1" integer DEFAULT 8 NOT NULL,
	"apgar5" integer DEFAULT 9 NOT NULL,
	"blood_group" text DEFAULT 'Unknown' NOT NULL,
	"inborn" boolean DEFAULT true NOT NULL,
	"acuity" text DEFAULT 'stable' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"isolation" text DEFAULT 'none' NOT NULL,
	"consultant" text DEFAULT '' NOT NULL,
	"clinical" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"kind" text DEFAULT 'note' NOT NULL,
	"text" text NOT NULL,
	"author" text DEFAULT 'System' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"shift" text DEFAULT 'Morning' NOT NULL,
	"from_staff" text DEFAULT '' NOT NULL,
	"to_staff" text DEFAULT '' NOT NULL,
	"illness" text DEFAULT 'stable' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contingency" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synthesis" text DEFAULT '' NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"acknowledged_by" text DEFAULT '' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oncall" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oncall_day_unique" UNIQUE("day")
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"system" text NOT NULL,
	"label" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"onset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roster_month_unique" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"text" text NOT NULL,
	"priority" text DEFAULT 'routine' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"owner" text DEFAULT 'Team' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"baby_id" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" text DEFAULT 'Nurse' NOT NULL,
	"hr" integer,
	"rr" integer,
	"spo2" integer,
	"spo2_post" integer,
	"temp" real,
	"sbp" integer,
	"dbp" integer,
	"map" integer,
	"crt" integer,
	"rbs" integer,
	"fio2" integer,
	"pain_score" integer,
	"urine_ml_kg_hr" real,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "babies_status_idx" ON "babies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_baby_idx" ON "events" USING btree ("baby_id","at");--> statement-breakpoint
CREATE INDEX "handovers_baby_idx" ON "handovers" USING btree ("baby_id","created_at");--> statement-breakpoint
CREATE INDEX "oncall_day_idx" ON "oncall" USING btree ("day");--> statement-breakpoint
CREATE INDEX "problems_baby_idx" ON "problems" USING btree ("baby_id");--> statement-breakpoint
CREATE INDEX "roster_month_idx" ON "roster" USING btree ("month");--> statement-breakpoint
CREATE INDEX "tasks_baby_idx" ON "tasks" USING btree ("baby_id");--> statement-breakpoint
CREATE INDEX "vitals_baby_idx" ON "vitals" USING btree ("baby_id","recorded_at");