CREATE TYPE "public"."alert_action" AS ENUM('ACKNOWLEDGED', 'RESOLVED', 'ESCALATED', 'DISMISSED', 'SNOOZED');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('INFO', 'WARNING', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('OVERDUE_DELIVERY', 'NCR_OPEN', 'INVOICE_PENDING', 'DOCUMENT_EXPIRING', 'MILESTONE_DUE', 'BUDGET_EXCEEDED', 'SUPPLIER_COMPLIANCE', 'QA_FAILED', 'PO_APPROVAL_PENDING', 'SHIPMENT_DELAYED', 'PAYMENT_OVERDUE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."co_category" AS ENUM('SCOPE', 'RATE', 'QUANTITY', 'SCHEDULE');--> statement-breakpoint
CREATE TYPE "public"."comment_parent_type" AS ENUM('PO', 'SHIPMENT', 'DELIVERY', 'QA_TASK', 'INVOICE');--> statement-breakpoint
CREATE TYPE "public"."conflict_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('INVOICE', 'PACKING_LIST', 'CMR', 'NCR_REPORT', 'EVIDENCE', 'PROGRESS_REPORT', 'CLIENT_INSTRUCTION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."email_ingestion_status" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');--> statement-breakpoint
CREATE TYPE "public"."eta_confidence" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."ingestion_source" AS ENUM('MANUAL_UPLOAD', 'EMAIL_INBOUND', 'SMARTSHEET_SYNC', 'EXCEL_IMPORT', 'API_INTEGRATION');--> statement-breakpoint
CREATE TYPE "public"."logistics_provider" AS ENUM('DHL_EXPRESS', 'DHL_FREIGHT', 'MAERSK', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ncr_attachment_category" AS ENUM('EVIDENCE', 'CORRECTIVE_ACTION', 'INSPECTION_REPORT', 'CREDIT_NOTE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ncr_issue_type" AS ENUM('DAMAGED', 'WRONG_SPEC', 'DOC_MISSING', 'QUANTITY_SHORT', 'QUALITY_DEFECT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."qa_task_status" AS ENUM('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED');--> statement-breakpoint
CREATE TYPE "public"."shipment_event_type" AS ENUM('GATE_IN', 'LOADED', 'VESSEL_DEPARTURE', 'TRANSSHIPMENT', 'DISCHARGE', 'GATE_OUT', 'VESSEL_DELAY', 'PRE_TRANSIT', 'PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'HELD_CUSTOMS', 'RETURNED', 'ETA_UPDATE', 'LOCATION_SCAN', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'EXCEPTION');--> statement-breakpoint
CREATE TYPE "public"."sync_provider" AS ENUM('SMARTSHEET', 'EXCEL_SCHEDULED', 'GOOGLE_SHEETS');--> statement-breakpoint
CREATE TYPE "public"."trust_level" AS ENUM('VERIFIED', 'INTERNAL', 'FORECAST');--> statement-breakpoint
ALTER TYPE "public"."ncr_status" ADD VALUE 'SUPPLIER_RESPONDED' BEFORE 'REVIEW';--> statement-breakpoint
ALTER TYPE "public"."ncr_status" ADD VALUE 'REINSPECTION' BEFORE 'REVIEW';--> statement-breakpoint
ALTER TYPE "public"."progress_source" ADD VALUE 'FORECAST';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'SUPER_ADMIN' BEFORE 'ADMIN';--> statement-breakpoint
CREATE TABLE "alert_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"organization_id" uuid NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"alert_severity" "alert_severity" NOT NULL,
	"alert_title" text NOT NULL,
	"alert_description" text,
	"entity_type" text,
	"entity_id" uuid,
	"entity_reference" text,
	"responded_by" text NOT NULL,
	"action" "alert_action" NOT NULL,
	"action_notes" text,
	"alert_generated_at" timestamp,
	"responded_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "client_instruction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"project_id" uuid NOT NULL,
	"instruction_number" text NOT NULL,
	"date_received" timestamp NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"attachment_url" text NOT NULL,
	"status" text DEFAULT 'PENDING_ESTIMATE',
	"estimated_cost" numeric,
	"approved_cost" numeric,
	"approved_by" text,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"parent_type" "comment_parent_type" NOT NULL,
	"parent_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_role" text NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1,
	"previous_version_id" uuid,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "delivery_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"shipment_id" uuid NOT NULL,
	"delivery_id" uuid,
	"received_at" timestamp DEFAULT now(),
	"received_by" text,
	"declared_qty" numeric,
	"received_qty" numeric NOT NULL,
	"variance_percent" numeric,
	"is_partial" boolean DEFAULT false,
	"condition" text,
	"notes" text,
	"photo_doc_ids" jsonb
);
--> statement-breakpoint
CREATE TABLE "email_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"email_ingestion_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text,
	"mime_type" text,
	"file_size" integer,
	"document_id" uuid,
	"extraction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "email_ingestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text,
	"body_text" text,
	"body_html" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"status" "email_ingestion_status" DEFAULT 'PENDING' NOT NULL,
	"matched_supplier_id" uuid,
	"matched_po_id" uuid,
	"processing_error" text,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "external_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" "sync_provider" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb,
	"target_project_id" uuid,
	"last_sync_at" timestamp,
	"last_sync_status" text,
	"last_sync_error" text,
	"sync_frequency" text DEFAULT 'MANUAL',
	"is_active" boolean DEFAULT true,
	"items_synced" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "milestone_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"milestone_id" uuid NOT NULL,
	"invoice_id" uuid,
	"approved_amount" numeric,
	"paid_amount" numeric DEFAULT '0',
	"retained_amount" numeric DEFAULT '0',
	"status" text DEFAULT 'NOT_STARTED',
	"approved_at" timestamp,
	"approved_by" text,
	"due_date" timestamp,
	"paid_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ncr_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"ncr_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"category" "ncr_attachment_category" NOT NULL,
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ncr_magic_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"ncr_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"viewed_at" timestamp,
	"last_action_at" timestamp,
	"actions_count" integer DEFAULT 0,
	CONSTRAINT "ncr_magic_link_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "qa_inspection_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"delivery_receipt_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"status" "qa_task_status" DEFAULT 'PENDING',
	"assigned_to" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"inspection_notes" text,
	"passed_items" integer DEFAULT 0,
	"failed_items" integer DEFAULT 0,
	"ncr_required" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "shipment_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"shipment_id" uuid NOT NULL,
	"event_type" "shipment_event_type" NOT NULL,
	"event_time" timestamp NOT NULL,
	"location" text,
	"description" text,
	"raw_api_data" jsonb,
	"source" text DEFAULT 'LOGISTICS_API'
);
--> statement-breakpoint
CREATE TABLE "supplier_accuracy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"supplier_id" uuid NOT NULL,
	"total_shipments" integer DEFAULT 0,
	"on_time_deliveries" integer DEFAULT 0,
	"late_deliveries" integer DEFAULT 0,
	"accuracy_score" numeric DEFAULT '0',
	"auto_accept_enabled" boolean DEFAULT false,
	"auto_accept_threshold" numeric DEFAULT '90',
	"last_calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"external_sync_id" uuid NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"items_processed" integer DEFAULT 0,
	"items_created" integer DEFAULT 0,
	"items_updated" integer DEFAULT 0,
	"items_failed" integer DEFAULT 0,
	"error_details" jsonb,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"organization_id" uuid,
	"config_key" text NOT NULL,
	"config_value" text NOT NULL,
	"config_type" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "usage_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"resource_id" uuid,
	"quantity" integer DEFAULT 1,
	"estimated_cost_usd" numeric,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "usage_quota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"organization_id" uuid NOT NULL,
	"monthly_ocr_limit" integer DEFAULT 100,
	"monthly_ai_parse_limit" integer DEFAULT 50,
	"monthly_email_ingest_limit" integer DEFAULT 200,
	"ocr_used_this_month" integer DEFAULT 0,
	"ai_parse_used_this_month" integer DEFAULT 0,
	"email_ingest_used_this_month" integer DEFAULT 0,
	"last_reset_at" timestamp DEFAULT now(),
	"current_period_start" timestamp DEFAULT now(),
	CONSTRAINT "usage_quota_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "ncr" DROP CONSTRAINT "ncr_boq_item_id_boq_item_id_fk";
--> statement-breakpoint
ALTER TABLE "ncr" DROP CONSTRAINT "ncr_raised_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ncr" ALTER COLUMN "severity" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."ncr_severity";--> statement-breakpoint
CREATE TYPE "public"."ncr_severity" AS ENUM('MINOR', 'MAJOR', 'CRITICAL');--> statement-breakpoint
ALTER TABLE "ncr" ALTER COLUMN "severity" SET DATA TYPE "public"."ncr_severity" USING "severity"::"public"."ncr_severity";--> statement-breakpoint
ALTER TABLE "invoice" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';--> statement-breakpoint
ALTER TABLE "ncr" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr_comment" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr_comment" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipment" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"public"."shipment_status";--> statement-breakpoint
ALTER TABLE "shipment" ALTER COLUMN "status" SET DATA TYPE "public"."shipment_status" USING "status"::"public"."shipment_status";--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "ros_date" timestamp;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "is_critical" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "ros_status" text DEFAULT 'NOT_SET';--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "quantity_delivered" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "quantity_installed" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "quantity_certified" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "is_variation" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "variation_order_number" text;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "client_instruction_id" uuid;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "original_quantity" numeric;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "revised_quantity" numeric;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "locked_for_de_scope" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "discipline" text;--> statement-breakpoint
ALTER TABLE "boq_item" ADD COLUMN "material_class" text;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "status" text DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "requested_by" text;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "requested_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "affected_milestone_ids" jsonb;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "scope_change" text;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "schedule_impact_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "change_order_type" text DEFAULT 'ADDITION';--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "client_instruction_id" uuid;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "affected_boq_item_ids" jsonb;--> statement-breakpoint
ALTER TABLE "change_order" ADD COLUMN "co_category" text DEFAULT 'SCOPE';--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "escalation_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "is_critical_path" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "is_financial_milestone" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "last_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "severity" "conflict_severity" DEFAULT 'MEDIUM';--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "shipment_id" uuid;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "delivery_receipt_id" uuid;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "supplier_value" text;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "logistics_value" text;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "field_value" text;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "auto_resolved" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "auto_resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "auto_resolved_reason" text;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "included_in_digest" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD COLUMN "digest_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "shipment_id" uuid;--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "is_partial" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "signature_captured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "signature_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "delivery_item" ADD COLUMN "quantity_declared" numeric;--> statement-breakpoint
ALTER TABLE "delivery_item" ADD COLUMN "variance_percent" numeric;--> statement-breakpoint
ALTER TABLE "delivery_item" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "document_type" "document_type";--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "ingestion_source" "ingestion_source" DEFAULT 'MANUAL_UPLOAD';--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "extraction_time_ms" integer;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "field_confidences" jsonb;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "detected_doc_type" text;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "requires_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD COLUMN "corrections_made" jsonb;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "change_order_id" uuid;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "payment_method" text;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "external_reference" text;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "paid_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "retention_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "payment_reference" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "validation_status" text DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "validation_notes" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "extracted_data" jsonb;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "confidence_score" numeric;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "submitted_by" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "milestone" ADD COLUMN "sequence_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "ncr_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "issue_type" "ncr_issue_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "affected_boq_item_id" uuid;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "supplier_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "qa_inspection_task_id" uuid;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "reported_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "reported_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "assigned_to" text;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "sla_due_at" timestamp;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "escalation_level" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "closed_by" text;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "closed_reason" text;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "proof_of_fix_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "requires_credit_note" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "credit_note_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "credit_note_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "milestones_locked_ids" jsonb;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "estimated_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "actual_cost" numeric;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "schedule_impact_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "has_financial_impact" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "has_schedule_impact" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "ncr" ADD COLUMN "ai_summary_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "ncr_comment" ADD COLUMN "magic_link_token" text;--> statement-breakpoint
ALTER TABLE "ncr_comment" ADD COLUMN "author_role" text;--> statement-breakpoint
ALTER TABLE "ncr_comment" ADD COLUMN "attachment_urls" jsonb;--> statement-breakpoint
ALTER TABLE "ncr_comment" ADD COLUMN "voice_note_url" text;--> statement-breakpoint
ALTER TABLE "ncr_comment" ADD COLUMN "is_internal" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "ncr_comment" ADD COLUMN "read_by" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "size" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "progress_record" ADD COLUMN "trust_level" "trust_level" DEFAULT 'INTERNAL';--> statement-breakpoint
ALTER TABLE "progress_record" ADD COLUMN "is_forecast" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "progress_record" ADD COLUMN "forecast_basis" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "scope" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "incoterms" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "retention_percentage" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "compliance_status" text DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "compliance_notes" text;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD COLUMN "progress_percentage" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "boq_item_id" uuid;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "provider" "logistics_provider";--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "carrier_normalized" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "container_number" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "bill_of_lading" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "vessel_name" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "voyage_number" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "seal_number" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "maersk_subscription_id" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "waybill_number" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "dhl_service" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "pod_signature_url" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "pod_signed_by" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "pod_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "last_latitude" numeric;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "last_longitude" numeric;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "maersk_weight" numeric;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "supplier_weight" numeric;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "received_weight" numeric;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "dispatch_date" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "supplier_aos" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "logistics_eta" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "ros_date" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "actual_delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "eta_confidence" "eta_confidence";--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "is_tracking_linked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "is_vessel_delayed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "is_exception" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "destination" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "origin_location" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "last_known_location" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "last_api_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "packing_list_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "cmr_doc_id" uuid;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "declared_qty" numeric;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "is_seal_intact" boolean;--> statement-breakpoint
ALTER TABLE "shipment" ADD COLUMN "is_container_stripped" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "supplier" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "supplier" ADD COLUMN "services" text;--> statement-breakpoint
ALTER TABLE "supplier" ADD COLUMN "readiness_score" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "supplier" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "alert_log" ADD CONSTRAINT "alert_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_log" ADD CONSTRAINT "alert_log_responded_by_user_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_instruction" ADD CONSTRAINT "client_instruction_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_instruction" ADD CONSTRAINT "client_instruction_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_receipt" ADD CONSTRAINT "delivery_receipt_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_receipt" ADD CONSTRAINT "delivery_receipt_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_receipt" ADD CONSTRAINT "delivery_receipt_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_email_ingestion_id_email_ingestion_id_fk" FOREIGN KEY ("email_ingestion_id") REFERENCES "public"."email_ingestion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachment" ADD CONSTRAINT "email_attachment_extraction_id_document_extraction_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."document_extraction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_ingestion" ADD CONSTRAINT "email_ingestion_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_ingestion" ADD CONSTRAINT "email_ingestion_matched_supplier_id_supplier_id_fk" FOREIGN KEY ("matched_supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_ingestion" ADD CONSTRAINT "email_ingestion_matched_po_id_purchase_order_id_fk" FOREIGN KEY ("matched_po_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_sync" ADD CONSTRAINT "external_sync_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_sync" ADD CONSTRAINT "external_sync_target_project_id_project_id_fk" FOREIGN KEY ("target_project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payment" ADD CONSTRAINT "milestone_payment_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payment" ADD CONSTRAINT "milestone_payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_payment" ADD CONSTRAINT "milestone_payment_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr_attachment" ADD CONSTRAINT "ncr_attachment_ncr_id_ncr_id_fk" FOREIGN KEY ("ncr_id") REFERENCES "public"."ncr"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr_attachment" ADD CONSTRAINT "ncr_attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr_magic_link" ADD CONSTRAINT "ncr_magic_link_ncr_id_ncr_id_fk" FOREIGN KEY ("ncr_id") REFERENCES "public"."ncr"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr_magic_link" ADD CONSTRAINT "ncr_magic_link_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_inspection_task" ADD CONSTRAINT "qa_inspection_task_delivery_receipt_id_delivery_receipt_id_fk" FOREIGN KEY ("delivery_receipt_id") REFERENCES "public"."delivery_receipt"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_inspection_task" ADD CONSTRAINT "qa_inspection_task_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_inspection_task" ADD CONSTRAINT "qa_inspection_task_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_event" ADD CONSTRAINT "shipment_event_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_accuracy" ADD CONSTRAINT "supplier_accuracy_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_log" ADD CONSTRAINT "sync_log_external_sync_id_external_sync_id_fk" FOREIGN KEY ("external_sync_id") REFERENCES "public"."external_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_quota" ADD CONSTRAINT "usage_quota_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_log_org_idx" ON "alert_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "alert_log_type_idx" ON "alert_log" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "alert_log_user_idx" ON "alert_log" USING btree ("responded_by");--> statement-breakpoint
CREATE INDEX "alert_log_entity_idx" ON "alert_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "comment_parent_idx" ON "comment" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE INDEX "shipment_event_time_idx" ON "shipment_event" USING btree ("shipment_id","event_time");--> statement-breakpoint
CREATE UNIQUE INDEX "config_key_org_idx" ON "system_config" USING btree ("organization_id","config_key");--> statement-breakpoint
CREATE INDEX "usage_event_org_date_idx" ON "usage_event" USING btree ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "change_order" ADD CONSTRAINT "change_order_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order" ADD CONSTRAINT "change_order_client_instruction_id_client_instruction_id_fk" FOREIGN KEY ("client_instruction_id") REFERENCES "public"."client_instruction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD CONSTRAINT "conflict_record_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD CONSTRAINT "conflict_record_delivery_receipt_id_delivery_receipt_id_fk" FOREIGN KEY ("delivery_receipt_id") REFERENCES "public"."delivery_receipt"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_record" ADD CONSTRAINT "conflict_record_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_shipment_id_shipment_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_signature_doc_id_document_id_fk" FOREIGN KEY ("signature_doc_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction" ADD CONSTRAINT "document_extraction_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_change_order_id_change_order_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_milestone_id_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestone"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_affected_boq_item_id_boq_item_id_fk" FOREIGN KEY ("affected_boq_item_id") REFERENCES "public"."boq_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_qa_inspection_task_id_qa_inspection_task_id_fk" FOREIGN KEY ("qa_inspection_task_id") REFERENCES "public"."qa_inspection_task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_source_document_id_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_proof_of_fix_doc_id_document_id_fk" FOREIGN KEY ("proof_of_fix_doc_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr" ADD CONSTRAINT "ncr_credit_note_doc_id_document_id_fk" FOREIGN KEY ("credit_note_doc_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_boq_item_id_boq_item_id_fk" FOREIGN KEY ("boq_item_id") REFERENCES "public"."boq_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_packing_list_doc_id_document_id_fk" FOREIGN KEY ("packing_list_doc_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_cmr_doc_id_document_id_fk" FOREIGN KEY ("cmr_doc_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ncr_number_org_idx" ON "ncr" USING btree ("organization_id","ncr_number");--> statement-breakpoint
CREATE INDEX "ncr_status_idx" ON "ncr" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ncr_severity_idx" ON "ncr" USING btree ("severity");--> statement-breakpoint
ALTER TABLE "ncr" DROP COLUMN "boq_item_id";--> statement-breakpoint
ALTER TABLE "ncr" DROP COLUMN "raised_by";--> statement-breakpoint
ALTER TABLE "shipment" DROP COLUMN "eta";