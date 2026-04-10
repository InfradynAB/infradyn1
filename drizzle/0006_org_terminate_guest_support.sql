-- Organization lifecycle + guest support tickets (shared schema with admin app)
ALTER TABLE "organization" ADD COLUMN "status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "terminated_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "terminated_by" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "termination_reason" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_by" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_terminated_by_user_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_suspended_by_user_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ALTER COLUMN "raised_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD COLUMN "requester_email" text;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD COLUMN "requester_name" text;--> statement-breakpoint
