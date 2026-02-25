CREATE TYPE "public"."support_ticket_category" AS ENUM('TECHNICAL', 'BILLING', 'ACCESS_ISSUE', 'BUG_REPORT', 'DATA_ISSUE', 'FEATURE_REQUEST', 'GENERAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'AWAITING_USER', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint

CREATE TABLE "support_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"ticket_number" text NOT NULL,
	"raised_by" text NOT NULL,
	"organization_id" uuid,
	"category" "support_ticket_category" DEFAULT 'GENERAL' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
	"status" "support_ticket_status" DEFAULT 'OPEN' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"assigned_to" text,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"last_activity_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "support_ticket_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"is_from_support" boolean DEFAULT false NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachment_url" text,
	"attachment_name" text,
	"attachment_type" text
);
--> statement-breakpoint

ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_raised_by_user_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_message" ADD CONSTRAINT "support_ticket_message_ticket_id_support_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_message" ADD CONSTRAINT "support_ticket_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "support_ticket_raised_by_idx" ON "support_ticket" ("raised_by");--> statement-breakpoint
CREATE INDEX "support_ticket_status_idx" ON "support_ticket" ("status");--> statement-breakpoint
CREATE INDEX "support_ticket_message_ticket_id_idx" ON "support_ticket_message" ("ticket_id");--> statement-breakpoint
