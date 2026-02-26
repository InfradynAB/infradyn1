CREATE TYPE "public"."boq_delivery_batch_status" AS ENUM(
	'PENDING',
	'IN_TRANSIT',
	'PARTIALLY_DELIVERED',
	'DELIVERED',
	'LATE',
	'CANCELLED'
);--> statement-breakpoint

ALTER TABLE "boq_item" ADD COLUMN "required_by_date" timestamp;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "criticality" text DEFAULT 'BUFFERED';--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "schedule_activity_ref" text;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "schedule_days_at_risk" integer DEFAULT 0;--> statement-breakpoint

CREATE TABLE "boq_delivery_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"boq_item_id" uuid NOT NULL,
	"linked_po_id" uuid,
	"batch_label" text NOT NULL,
	"expected_date" timestamp,
	"actual_date" timestamp,
	"quantity_expected" numeric DEFAULT '0' NOT NULL,
	"quantity_delivered" numeric DEFAULT '0' NOT NULL,
	"status" "boq_delivery_batch_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text
);--> statement-breakpoint

ALTER TABLE "boq_delivery_batch"
	ADD CONSTRAINT "boq_delivery_batch_boq_item_id_boq_item_id_fk"
	FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "boq_delivery_batch"
	ADD CONSTRAINT "boq_delivery_batch_linked_po_id_purchase_order_id_fk"
	FOREIGN KEY ("linked_po_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "boq_delivery_batch_boq_item_idx" ON "boq_delivery_batch" ("boq_item_id");--> statement-breakpoint
CREATE INDEX "boq_delivery_batch_linked_po_idx" ON "boq_delivery_batch" ("linked_po_id");--> statement-breakpoint
