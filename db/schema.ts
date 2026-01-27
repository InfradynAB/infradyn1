import { pgTable, uuid, text, timestamp, boolean, integer, numeric, pgEnum, uniqueIndex, check, index, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['SUPER_ADMIN', 'ADMIN', 'PM', 'SUPPLIER', 'QA', 'SITE_RECEIVER']);
export const parentTypeEnum = pgEnum('parent_type', ['PO', 'BOQ', 'INVOICE', 'PACKING_LIST', 'CMR', 'NCR', 'EVIDENCE']);
export const progressSourceEnum = pgEnum('progress_source', ['SRP', 'IRP', 'FORECAST']);
export const conflictTypeEnum = pgEnum('conflict_type', ['QUANTITY_MISMATCH', 'PROGRESS_MISMATCH', 'DATE_VARIANCE', 'EVIDENCE_FAILURE', 'NCR_CONFLICT']);
export const conflictStateEnum = pgEnum('conflict_state', ['OPEN', 'REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED']);
export const ncrSeverityEnum = pgEnum('ncr_severity', ['MINOR', 'MAJOR', 'CRITICAL']);
export const ncrStatusEnum = pgEnum('ncr_status', ['OPEN', 'SUPPLIER_RESPONDED', 'REINSPECTION', 'REVIEW', 'REMEDIATION', 'CLOSED']);
export const ncrIssueTypeEnum = pgEnum('ncr_issue_type', ['DAMAGED', 'WRONG_SPEC', 'DOC_MISSING', 'QUANTITY_SHORT', 'QUALITY_DEFECT', 'OTHER']);
export const ncrAttachmentCategoryEnum = pgEnum('ncr_attachment_category', ['EVIDENCE', 'CORRECTIVE_ACTION', 'INSPECTION_REPORT', 'CREDIT_NOTE', 'OTHER']);
export const ledgerStatusEnum = pgEnum('ledger_status', ['COMMITTED', 'PAID', 'PENDING', 'CANCELLED']);
export const trustLevelEnum = pgEnum('trust_level', ['VERIFIED', 'INTERNAL', 'FORECAST']);
export const documentTypeEnum = pgEnum('document_type', ['INVOICE', 'PACKING_LIST', 'CMR', 'NCR_REPORT', 'EVIDENCE', 'PROGRESS_REPORT', 'CLIENT_INSTRUCTION', 'OTHER']);

// Phase 5: Advanced Ingestion Enums
export const ingestionSourceEnum = pgEnum('ingestion_source', ['MANUAL_UPLOAD', 'EMAIL_INBOUND', 'SMARTSHEET_SYNC', 'EXCEL_IMPORT', 'API_INTEGRATION']);
export const emailIngestionStatusEnum = pgEnum('email_ingestion_status', ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED']);
export const syncProviderEnum = pgEnum('sync_provider', ['SMARTSHEET', 'EXCEL_SCHEDULED', 'GOOGLE_SHEETS']);

// Phase 6: Logistics & Delivery Tracking Enums
export const shipmentStatusEnum = pgEnum('shipment_status', [
    'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
    'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'EXCEPTION'
]);
export const etaConfidenceEnum = pgEnum('eta_confidence', ['HIGH', 'MEDIUM', 'LOW']);
export const conflictSeverityEnum = pgEnum('conflict_severity', ['LOW', 'MEDIUM', 'HIGH']);
export const qaTaskStatusEnum = pgEnum('qa_task_status', ['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED']);
export const commentParentTypeEnum = pgEnum('comment_parent_type', ['PO', 'SHIPMENT', 'DELIVERY', 'QA_TASK', 'INVOICE']);

// Multi-provider logistics
export const logisticsProviderEnum = pgEnum('logistics_provider', [
    'DHL_EXPRESS', 'DHL_FREIGHT', 'MAERSK', 'OTHER'
]);

export const shipmentEventTypeEnum = pgEnum('shipment_event_type', [
    // Maersk DCSA codes
    'GATE_IN', 'LOADED', 'VESSEL_DEPARTURE', 'TRANSSHIPMENT',
    'DISCHARGE', 'GATE_OUT', 'VESSEL_DELAY',
    // DHL status codes
    'PRE_TRANSIT', 'PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
    'DELIVERED', 'EXCEPTION', 'HELD_CUSTOMS', 'RETURNED',
    // Common
    'ETA_UPDATE', 'LOCATION_SCAN', 'OTHER'
]);


// --- SHARED COLUMNS ---
const baseColumns = {
    id: uuid('id').defaultRandom().primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
};

// --- 1. ORGANIZATION & ACCESS CONTROL ---

export const organization = pgTable('organization', {
    ...baseColumns,
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    metadata: jsonb('metadata'),
    retentionPolicyDays: integer('retention_policy_days').default(365).notNull(),
    // Admin Dashboard Fields
    industry: text('industry'),
    size: text('size'), // e.g., "1-10", "11-50", "51-200", "200+"
    contactEmail: text('contact_email'),
    description: text('description'),
    phone: text('phone'),
    website: text('website'),
});

export const member = pgTable('member', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    userId: text('user_id').references(() => user.id).notNull(),
    role: text('role').default('MEMBER').notNull(),
});

export const project = pgTable('project', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    name: text('name').notNull(),
    code: text('code'),
    location: text('location'),
    currency: text('currency').default('USD'),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    budget: numeric('budget'),
    materialCategories: jsonb('material_categories').$type<string[]>(), // Array of category names
});

export const invitation = pgTable('invitation', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    email: text('email').notNull(),
    role: text('role').default('MEMBER').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    status: text('status').default('PENDING').notNull(), // PENDING, ACCEPTED, EXPIRED
    // Phase 3B: Link invite to supplier
    supplierId: uuid('supplier_id').references(() => supplier.id),
});

// Merged User Table (Better Auth + App Fields)
export const user = pgTable('user', {
    // Better Auth Fields
    id: text("id").primaryKey(), // Changed to text for Better Auth compatibility
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").default(false),

    // App Specific Fields
    organizationId: uuid('organization_id').references(() => organization.id), // Nullable initially or handle via onboarding
    passwordHash: text('password_hash'),
    phone: text('phone'),
    role: userRoleEnum('role').default('PM').notNull(),
    // Phase 3B: Link user to supplier
    supplierId: uuid('supplier_id'),


    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
    isDeleted: boolean('is_deleted').default(false).notNull(),
});

// Better Auth Tables
export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const twoFactor = pgTable("two_factor", {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").default(false),
});

export const projectUser = pgTable('project_user', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    userId: text('user_id').references(() => user.id).notNull(),
}, (t) => ({
    unq: uniqueIndex('project_user_unq').on(t.projectId, t.userId),
}));

// --- 2. SUPPLIER MANAGEMENT ---

export const supplier = pgTable('supplier', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    name: text('name').notNull(),
    contactEmail: text('contact_email'),
    taxId: text('tax_id'),
    userId: text('user_id').references(() => user.id),
    status: text('status').default('INACTIVE').notNull(), // INACTIVE, ONBOARDING, ACTIVE, SUSPENDED
    // Phase 3B: Onboarding fields
    industry: text('industry'),
    services: text('services'), // JSON string or comma-separated
    readinessScore: numeric('readiness_score').default('0'),
    isVerified: boolean('is_verified').default(false),
});

export const supplierDocument = pgTable('supplier_document', {
    ...baseColumns,
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),
    documentType: text('document_type').notNull(),
    fileUrl: text('file_url').notNull(),
    status: text('status').default('PENDING'),
    validUntil: timestamp('valid_until'),
});

// --- 3. PURCHASE ORDERS & PROCUREMENT ---

export const purchaseOrder = pgTable('purchase_order', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    projectId: uuid('project_id').references(() => project.id).notNull(),
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),
    poNumber: text('po_number').notNull(),
    totalValue: numeric('total_value').notNull(),
    currency: text('currency').default('USD').notNull(),
    status: text('status').default('DRAFT').notNull(),
    // Phase 2 additions
    scope: text('scope'), // Project scope description
    paymentTerms: text('payment_terms'), // e.g., "Net 30", "50% advance, 50% on delivery"
    incoterms: text('incoterms'), // e.g., "FOB", "CIF", "DDP"
    retentionPercentage: numeric('retention_percentage').default('0'), // Retention %
    complianceStatus: text('compliance_status').default('PENDING'), // PENDING, PASSED, FAILED
    complianceNotes: text('compliance_notes'), // Validator notes/flags
    // Phase 6 additions
    progressPercentage: numeric('progress_percentage').default('0'), // Overall delivery progress
}, (t) => ({
    poNumberIdx: uniqueIndex('po_number_idx').on(t.projectId, t.poNumber),
}));


export const poVersion = pgTable('po_version', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    versionNumber: integer('version_number').notNull(),
    changeDescription: text('change_description'),
    fileUrl: text('file_url'), // S3 link to PDF
});

export const boqItem = pgTable('boq_item', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    itemNumber: text('item_number').notNull(),
    description: text('description').notNull(),
    unit: text('unit').notNull(),
    quantity: numeric('quantity').notNull(),
    unitPrice: numeric('unit_price').notNull(),
    totalPrice: numeric('total_price').notNull(),
    // Phase 2 additions - ROS (Required On Site)
    rosDate: timestamp('ros_date'), // Required on site date
    isCritical: boolean('is_critical').default(false), // Critical material flag
    rosStatus: text('ros_status').default('NOT_SET'), // NOT_SET, SET, TBD
    // Phase 6 additions - Delivery tracking
    quantityDelivered: numeric('quantity_delivered').default('0'),
    // Phase 5 Revised - Progress Tracking Hierarchy: Certified ≤ Installed ≤ Delivered
    quantityInstalled: numeric('quantity_installed').default('0'), // Site Engineer logs physical work
    quantityCertified: numeric('quantity_certified').default('0'), // QS/PM approves for payment
    // Phase 5 Revised - Variation Order Support
    isVariation: boolean('is_variation').default(false), // True if this is a VO item
    variationOrderNumber: text('variation_order_number'), // e.g., VO-001
    clientInstructionId: uuid('client_instruction_id'), // Link to ClientInstruction (added later, no FK yet)
    originalQuantity: numeric('original_quantity'), // Original before de-scope
    revisedQuantity: numeric('revised_quantity'), // After de-scope (null = use quantity)
    lockedForDeScope: boolean('locked_for_de_scope').default(false), // True if cannot reduce further
});


export const milestone = pgTable('milestone', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    expectedDate: timestamp('expected_date'),
    paymentPercentage: numeric('payment_percentage').notNull(),
    amount: numeric('amount'),
    status: text('status').default('PENDING'),
    // Phase 2 additions
    sequenceOrder: integer('sequence_order').default(0), // Order in milestone flow
});

// --- 4. DOCUMENT INGESTION ---

export const document = pgTable('document', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    projectId: uuid('project_id').references(() => project.id),
    parentId: uuid('parent_id').notNull(),
    parentType: parentTypeEnum('parent_type').notNull(),

    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    mimeType: text('mime_type'),
    uploadedBy: text('uploaded_by').references(() => user.id),
    // Phase 4: Manual classification for training AI
    documentType: documentTypeEnum('document_type'),
});

export const documentExtraction = pgTable('document_extraction', {
    ...baseColumns,
    documentId: uuid('document_id').references(() => document.id).notNull(),
    rawText: text('raw_text'),
    parsedJson: text('parsed_json'),
    confidenceScore: numeric('confidence_score'),
    status: text('status').default('PENDING'),
    // Phase 5: Enhanced extraction metadata
    ingestionSource: ingestionSourceEnum('ingestion_source').default('MANUAL_UPLOAD'),
    aiModel: text('ai_model'), // e.g., 'gpt-4o-mini', 'gpt-4-vision'
    extractionTimeMs: integer('extraction_time_ms'),
    fieldConfidences: jsonb('field_confidences').$type<Record<string, number>>(), // { poNumber: 0.95, vendor: 0.87 }
    detectedDocType: text('detected_doc_type'), // AI-detected document type
    requiresReview: boolean('requires_review').default(false),
    reviewedAt: timestamp('reviewed_at'),
    reviewedBy: text('reviewed_by').references(() => user.id),
    correctionsMade: jsonb('corrections_made').$type<Record<string, { original: string; corrected: string }>>(),
});

// --- Phase 5: EMAIL INGESTION ---

export const emailIngestion = pgTable('email_ingestion', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    fromEmail: text('from_email').notNull(),
    toEmail: text('to_email').notNull(), // org-specific inbox e.g., po-abc123@ingest.infradyn.com
    subject: text('subject'),
    bodyText: text('body_text'),
    bodyHtml: text('body_html'),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    status: emailIngestionStatusEnum('status').default('PENDING').notNull(),
    matchedSupplierId: uuid('matched_supplier_id').references(() => supplier.id),
    matchedPoId: uuid('matched_po_id').references(() => purchaseOrder.id),
    processingError: text('processing_error'),
    processedAt: timestamp('processed_at'),
});

export const emailAttachment = pgTable('email_attachment', {
    ...baseColumns,
    emailIngestionId: uuid('email_ingestion_id').references(() => emailIngestion.id).notNull(),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url'), // S3 URL after upload
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
    documentId: uuid('document_id').references(() => document.id), // Link to processed document
    extractionId: uuid('extraction_id').references(() => documentExtraction.id),
});

// --- Phase 5: EXTERNAL SYNC ---

export const externalSync = pgTable('external_sync', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    provider: syncProviderEnum('provider').notNull(),
    name: text('name').notNull(), // User-friendly name
    config: jsonb('config').$type<{
        apiKey?: string;
        sheetId?: string;
        workspaceId?: string;
        columnMappings?: Record<string, string>;
    }>(),
    targetProjectId: uuid('target_project_id').references(() => project.id),
    lastSyncAt: timestamp('last_sync_at'),
    lastSyncStatus: text('last_sync_status'), // SUCCESS, PARTIAL, FAILED
    lastSyncError: text('last_sync_error'),
    syncFrequency: text('sync_frequency').default('MANUAL'), // HOURLY, DAILY, MANUAL
    isActive: boolean('is_active').default(true),
    itemsSynced: integer('items_synced').default(0),
});

export const syncLog = pgTable('sync_log', {
    ...baseColumns,
    externalSyncId: uuid('external_sync_id').references(() => externalSync.id).notNull(),
    syncedAt: timestamp('synced_at').defaultNow().notNull(),
    status: text('status').notNull(), // SUCCESS, PARTIAL, FAILED
    itemsProcessed: integer('items_processed').default(0),
    itemsCreated: integer('items_created').default(0),
    itemsUpdated: integer('items_updated').default(0),
    itemsFailed: integer('items_failed').default(0),
    errorDetails: jsonb('error_details'),
    durationMs: integer('duration_ms'),
});

// --- Phase 5: USAGE QUOTAS ---

export const usageQuota = pgTable('usage_quota', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull().unique(),
    // Monthly limits
    monthlyOcrLimit: integer('monthly_ocr_limit').default(100), // Pages per month
    monthlyAiParseLimit: integer('monthly_ai_parse_limit').default(50), // Documents per month
    monthlyEmailIngestLimit: integer('monthly_email_ingest_limit').default(200), // Emails per month
    // Current usage (reset monthly)
    ocrUsedThisMonth: integer('ocr_used_this_month').default(0),
    aiParseUsedThisMonth: integer('ai_parse_used_this_month').default(0),
    emailIngestUsedThisMonth: integer('email_ingest_used_this_month').default(0),
    // Tracking
    lastResetAt: timestamp('last_reset_at').defaultNow(),
    currentPeriodStart: timestamp('current_period_start').defaultNow(),
});

export const usageEvent = pgTable('usage_event', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    eventType: text('event_type').notNull(), // OCR_PAGE, AI_PARSE, EMAIL_INGEST
    resourceId: uuid('resource_id'), // documentId, emailIngestionId, etc.
    quantity: integer('quantity').default(1),
    estimatedCostUsd: numeric('estimated_cost_usd'),
    metadata: jsonb('metadata'),
}, (t) => ({
    orgDateIdx: index('usage_event_org_date_idx').on(t.organizationId, t.createdAt),
}));

// --- 5. LOGISTICS & DELIVERY (Phase 6 Extended) ---

export const shipment = pgTable('shipment', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    boqItemId: uuid('boq_item_id').references(() => boqItem.id), // Optional: link to specific BOQ item
    supplierId: uuid('supplier_id').references(() => supplier.id),

    // Multi-provider support
    provider: logisticsProviderEnum('provider'), // DHL_EXPRESS, DHL_FREIGHT, MAERSK, OTHER

    // Core tracking (legacy/fallback)
    trackingNumber: text('tracking_number'),
    carrier: text('carrier'),
    carrierNormalized: text('carrier_normalized'),

    // === MAERSK Container Tracking ===
    containerNumber: text('container_number'), // Format: MSKU1234567 (4 letters + 7 digits)
    billOfLading: text('bill_of_lading'),
    vesselName: text('vessel_name'),
    voyageNumber: text('voyage_number'),
    sealNumber: text('seal_number'),
    maerskSubscriptionId: text('maersk_subscription_id'),

    // === DHL Tracking ===
    waybillNumber: text('waybill_number'), // 10 digits (Express) or alphanumeric (Freight)
    dhlService: text('dhl_service'), // 'express' | 'freight'
    podSignatureUrl: text('pod_signature_url'), // Proof of Delivery signature image URL
    podSignedBy: text('pod_signed_by'),
    podSignedAt: timestamp('pod_signed_at'),

    // Coordinates for map visualization
    lastLatitude: numeric('last_latitude'),
    lastLongitude: numeric('last_longitude'),

    // Weight reconciliation (Maersk)
    maerskWeight: numeric('maersk_weight'), // Weight from Maersk API
    supplierWeight: numeric('supplier_weight'), // Weight from supplier packing list
    receivedWeight: numeric('received_weight'), // Weight measured at site

    // Dates
    dispatchDate: timestamp('dispatch_date'),
    supplierAos: timestamp('supplier_aos'), // Supplier-declared Arrival on Site
    logisticsEta: timestamp('logistics_eta'), // API-provided ETA
    rosDate: timestamp('ros_date'), // Required on Site date (from BOQ item)
    actualDeliveryDate: timestamp('actual_delivery_date'),

    // Status & Confidence
    status: shipmentStatusEnum('status').default('PENDING'),
    etaConfidence: etaConfidenceEnum('eta_confidence'),
    isTrackingLinked: boolean('is_tracking_linked').default(false),
    isVesselDelayed: boolean('is_vessel_delayed').default(false), // VSD flag (Maersk)
    isException: boolean('is_exception').default(false), // Exception flag (DHL)

    // Metadata
    destination: text('destination'),
    originLocation: text('origin_location'),
    lastKnownLocation: text('last_known_location'),
    lastApiSyncAt: timestamp('last_api_sync_at'),

    // Documents
    packingListDocId: uuid('packing_list_doc_id').references(() => document.id),
    cmrDocId: uuid('cmr_doc_id').references(() => document.id),

    // Quantities
    declaredQty: numeric('declared_qty'),
    unit: text('unit'),

    // Site reception (Maersk)
    isSealIntact: boolean('is_seal_intact'),
    isContainerStripped: boolean('is_container_stripped').default(false),
});

// Shipment event stream (tracking events from API or manual)
export const shipmentEvent = pgTable('shipment_event', {
    ...baseColumns,
    shipmentId: uuid('shipment_id').references(() => shipment.id).notNull(),
    eventType: shipmentEventTypeEnum('event_type').notNull(),
    eventTime: timestamp('event_time').notNull(),
    location: text('location'),
    description: text('description'),
    rawApiData: jsonb('raw_api_data'),
    source: text('source').default('LOGISTICS_API'), // LOGISTICS_API, SUPPLIER, MANUAL
}, (t) => ({
    shipmentTimeIdx: index('shipment_event_time_idx').on(t.shipmentId, t.eventTime),
}));

export const packingList = pgTable('packing_list', {
    ...baseColumns,
    shipmentId: uuid('shipment_id').references(() => shipment.id).notNull(),
    documentId: uuid('document_id').references(() => document.id),
});

export const delivery = pgTable('delivery', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    shipmentId: uuid('shipment_id').references(() => shipment.id), // Phase 6: link to shipment
    shippingNoteNumber: text('shipping_note_number'),
    receivedDate: timestamp('received_date').defaultNow(),
    receivedBy: text('received_by').references(() => user.id),
    // Phase 6: Delivery confirmation fields
    isPartial: boolean('is_partial').default(false),
    signatureCaptured: boolean('signature_captured').default(false),
    signatureDocId: uuid('signature_doc_id').references(() => document.id),
});

export const deliveryItem = pgTable('delivery_item', {
    ...baseColumns,
    deliveryId: uuid('delivery_id').references(() => delivery.id).notNull(),
    boqItemId: uuid('boq_item_id').references(() => boqItem.id).notNull(),
    quantityDelivered: numeric('quantity_delivered').notNull(),
    quantityDeclared: numeric('quantity_declared'), // Phase 6: supplier-declared qty
    condition: text('condition'), // GOOD, DAMAGED, MISSING_ITEMS
    variancePercent: numeric('variance_percent'), // Phase 6: auto-calculated
    notes: text('notes'),
});

// Phase 6: Delivery receipt for site confirmation
export const deliveryReceipt = pgTable('delivery_receipt', {
    ...baseColumns,
    shipmentId: uuid('shipment_id').references(() => shipment.id).notNull(),
    deliveryId: uuid('delivery_id').references(() => delivery.id),
    receivedAt: timestamp('received_at').defaultNow(),
    receivedBy: text('received_by').references(() => user.id),

    // Quantities
    declaredQty: numeric('declared_qty'),
    receivedQty: numeric('received_qty').notNull(),
    variancePercent: numeric('variance_percent'),

    // Status
    isPartial: boolean('is_partial').default(false),
    condition: text('condition'),
    notes: text('notes'),

    // Evidence
    photoDocIds: jsonb('photo_doc_ids').$type<string[]>(),
});

// Phase 6: QA Inspection tasks (auto-created on delivery)
export const qaInspectionTask = pgTable('qa_inspection_task', {
    ...baseColumns,
    deliveryReceiptId: uuid('delivery_receipt_id').references(() => deliveryReceipt.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),

    status: qaTaskStatusEnum('status').default('PENDING'),
    assignedTo: text('assigned_to').references(() => user.id),
    dueDate: timestamp('due_date'),
    completedAt: timestamp('completed_at'),

    // Findings
    inspectionNotes: text('inspection_notes'),
    passedItems: integer('passed_items').default(0),
    failedItems: integer('failed_items').default(0),
    ncrRequired: boolean('ncr_required').default(false),
});

// --- Phase 7: NCR (Non-Conformance Report) Management ---

export const ncr = pgTable('ncr', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id).notNull(),
    projectId: uuid('project_id').references(() => project.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),

    // Identification
    ncrNumber: text('ncr_number').notNull(), // Auto-generated: NCR-001

    // Classification
    severity: ncrSeverityEnum('severity').notNull(),
    status: ncrStatusEnum('status').default('OPEN').notNull(),
    issueType: ncrIssueTypeEnum('issue_type').notNull(),

    // Details
    title: text('title').notNull(),
    description: text('description'),

    // Links
    affectedBoqItemId: uuid('affected_boq_item_id').references(() => boqItem.id),
    batchId: text('batch_id'),
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),
    qaInspectionTaskId: uuid('qa_inspection_task_id').references(() => qaInspectionTask.id),
    sourceDocumentId: uuid('source_document_id').references(() => document.id), // Uploaded external NCR

    // Workflow
    reportedBy: text('reported_by').references(() => user.id).notNull(),
    reportedAt: timestamp('reported_at').defaultNow().notNull(),
    assignedTo: text('assigned_to').references(() => user.id),

    // SLA
    slaDueAt: timestamp('sla_due_at'),
    escalationLevel: integer('escalation_level').default(0),

    // Closure
    closedBy: text('closed_by').references(() => user.id),
    closedAt: timestamp('closed_at'),
    closedReason: text('closed_reason'),
    proofOfFixDocId: uuid('proof_of_fix_doc_id').references(() => document.id),

    // Payment Shield
    requiresCreditNote: boolean('requires_credit_note').default(false),
    creditNoteDocId: uuid('credit_note_doc_id').references(() => document.id),
    creditNoteVerifiedAt: timestamp('credit_note_verified_at'),
    milestonesLockedIds: jsonb('milestones_locked_ids').$type<string[]>(),

    // AI Summarizer
    aiSummary: text('ai_summary'),
    aiSummaryUpdatedAt: timestamp('ai_summary_updated_at'),
}, (t) => ({
    ncrNumberIdx: uniqueIndex('ncr_number_org_idx').on(t.organizationId, t.ncrNumber),
    statusIdx: index('ncr_status_idx').on(t.status),
    severityIdx: index('ncr_severity_idx').on(t.severity),
}));

export const ncrComment = pgTable('ncr_comment', {
    ...baseColumns,
    ncrId: uuid('ncr_id').references(() => ncr.id).notNull(),

    // Author (either logged-in user or via magic link)
    userId: text('user_id').references(() => user.id),
    magicLinkToken: text('magic_link_token'), // If submitted via supplier magic link
    authorRole: text('author_role'), // SUPPLIER, QA, PM, etc.

    // Content
    content: text('content'),
    attachmentUrls: jsonb('attachment_urls').$type<string[]>(),
    voiceNoteUrl: text('voice_note_url'), // S3 URL for audio file

    // Visibility
    isInternal: boolean('is_internal').default(false), // Hidden from supplier

    // Read tracking - stores array of { userId: string, readAt: string, role: string }
    readBy: jsonb('read_by').$type<{ userId: string; readAt: string; role: string }[]>().default([]),
});

export const ncrAttachment = pgTable('ncr_attachment', {
    ...baseColumns,
    ncrId: uuid('ncr_id').references(() => ncr.id).notNull(),

    fileUrl: text('file_url').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),

    category: ncrAttachmentCategoryEnum('category').notNull(),
    uploadedBy: text('uploaded_by').references(() => user.id),
    uploadedAt: timestamp('uploaded_at').defaultNow(),
});

export const ncrMagicLink = pgTable('ncr_magic_link', {
    ...baseColumns,
    ncrId: uuid('ncr_id').references(() => ncr.id).notNull(),
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),

    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),

    // Audit trail
    viewedAt: timestamp('viewed_at'),
    lastActionAt: timestamp('last_action_at'),
    actionsCount: integer('actions_count').default(0),
});

// --- 6. SUPPLIER & INTERNAL PROGRESS (Dual Path) ---


export const progressRecord = pgTable('progress_record', {
    ...baseColumns,
    milestoneId: uuid('milestone_id').references(() => milestone.id).notNull(),
    source: progressSourceEnum('source').notNull(), // SRP, IRP, or FORECAST
    percentComplete: numeric('percent_complete').notNull(),
    comment: text('comment'),
    reportedDate: timestamp('reported_date').defaultNow().notNull(),
    reportedBy: text('reported_by').references(() => user.id),
    // Phase 4: Trust & Forecasting
    trustLevel: trustLevelEnum('trust_level').default('INTERNAL'),
    isForecast: boolean('is_forecast').default(false),
    forecastBasis: text('forecast_basis'), // Explanation for AI-generated forecasts
}, (t) => ({
    percentCheck: check('percent_check', sql`${t.percentComplete} >= 0 AND ${t.percentComplete} <= 100`),
}));

export const evidenceBundle = pgTable('evidence_bundle', {
    ...baseColumns,
    progressRecordId: uuid('progress_record_id').references(() => progressRecord.id).notNull(),
    description: text('description'),
});

export const evidenceFile = pgTable('evidence_file', {
    ...baseColumns,
    evidenceBundleId: uuid('evidence_bundle_id').references(() => evidenceBundle.id).notNull(),
    documentId: uuid('document_id').references(() => document.id).notNull(),
    gpsCoordinates: text('gps_coordinates'),
    timestamp: timestamp('timestamp'),
});

// --- 7. CONFLICT ENGINE ---

export const conflictRecord = pgTable('conflict_record', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    milestoneId: uuid('milestone_id').references(() => milestone.id),

    type: conflictTypeEnum('type').notNull(),
    state: conflictStateEnum('state').default('OPEN').notNull(),

    deviationPercent: numeric('deviation_percent'),
    description: text('description'),
    slaDeadline: timestamp('sla_deadline'),

    assignedTo: text('assigned_to').references(() => user.id),
    // Phase 4: Escalation tracking
    escalationLevel: integer('escalation_level').default(0), // 0=None, 1=PM, 2=Exec, 3=Finance
    isCriticalPath: boolean('is_critical_path').default(false),
    isFinancialMilestone: boolean('is_financial_milestone').default(false),
    lastReminderAt: timestamp('last_reminder_at'),

    // Phase 6: Enhanced conflict tracking
    severity: conflictSeverityEnum('severity').default('MEDIUM'),
    shipmentId: uuid('shipment_id').references(() => shipment.id),
    deliveryReceiptId: uuid('delivery_receipt_id').references(() => deliveryReceipt.id),
    invoiceId: uuid('invoice_id').references(() => invoice.id),

    // Comparison values for conflict queue display
    supplierValue: text('supplier_value'),
    logisticsValue: text('logistics_value'),
    fieldValue: text('field_value'),

    // Auto-resolution tracking
    autoResolved: boolean('auto_resolved').default(false),
    autoResolvedAt: timestamp('auto_resolved_at'),
    autoResolvedReason: text('auto_resolved_reason'),

    // Digest tracking
    includedInDigest: boolean('included_in_digest').default(false),
    digestSentAt: timestamp('digest_sent_at'),
});


// --- 8. CONFIDENCE & RISK ---

export const confidenceScore = pgTable('confidence_score', {
    ...baseColumns,
    progressRecordId: uuid('progress_record_id').references(() => progressRecord.id).notNull(),
    score: numeric('score').notNull(), // 0-100
    factors: text('factors'), // JSON string detailing why
});

export const riskProfile = pgTable('risk_profile', {
    ...baseColumns,
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id), // Optional: risk per PO
    overallRiskScore: numeric('overall_risk_score').notNull(),
    lastAssessedAt: timestamp('last_assessed_at').defaultNow(),
});

// --- 9. FINANCIALS ---

export const invoice = pgTable('invoice', {
    ...baseColumns,
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    amount: numeric('amount').notNull(),
    invoiceDate: timestamp('invoice_date').notNull(),
    status: text('status').default('PENDING_APPROVAL'), // PENDING_APPROVAL, APPROVED, PARTIALLY_PAID, PAID, REJECTED, OVERDUE
    documentId: uuid('document_id').references(() => document.id),
    // Phase 5: Payment tracking
    milestoneId: uuid('milestone_id').references(() => milestone.id),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    paidAmount: numeric('paid_amount').default('0'),
    retentionAmount: numeric('retention_amount').default('0'),
    paymentReference: text('payment_reference'), // External ERP reference
    validationStatus: text('validation_status').default('PENDING'), // PENDING, PASSED, FAILED, MISMATCH
    validationNotes: text('validation_notes'),
    // AI Extraction fields
    extractedData: jsonb('extracted_data'), // Raw AI extraction result
    confidenceScore: numeric('confidence_score'), // AI confidence 0-1
    // Approval workflow
    submittedBy: text('submitted_by').references(() => user.id),
    submittedAt: timestamp('submitted_at'),
    approvedBy: text('approved_by').references(() => user.id),
    approvedAt: timestamp('approved_at'),
    rejectionReason: text('rejection_reason'),
}, (t) => ({
    invoiceNumberIdx: uniqueIndex('invoice_number_idx').on(t.supplierId, t.invoiceNumber),
}));

export const invoiceItem = pgTable('invoice_item', {
    ...baseColumns,
    invoiceId: uuid('invoice_id').references(() => invoice.id).notNull(),
    boqItemId: uuid('boq_item_id').references(() => boqItem.id).notNull(),
    quantity: numeric('quantity').notNull(),
    lineTotal: numeric('line_total').notNull(),
});

// Phase 5 Revised - Client Instruction Entity (for Variation Orders)
export const clientInstruction = pgTable('client_instruction', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    instructionNumber: text('instruction_number').notNull(), // CVI-001, AI-045
    dateReceived: timestamp('date_received').notNull(),
    type: text('type').notNull(), // SITE_INSTRUCTION, ARCHITECT_INSTRUCTION, EMAIL_VARIATION
    description: text('description'),
    attachmentUrl: text('attachment_url').notNull(), // Mandatory PDF/Image for legal traceability
    status: text('status').default('PENDING_ESTIMATE'), // PENDING_ESTIMATE, COSTED, APPROVED, REJECTED
    estimatedCost: numeric('estimated_cost'),
    approvedCost: numeric('approved_cost'),
    approvedBy: text('approved_by').references(() => user.id),
    approvedAt: timestamp('approved_at'),
});

export const changeOrder = pgTable('change_order', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    changeNumber: text('change_number').notNull(),
    reason: text('reason'),
    amountDelta: numeric('amount_delta').notNull(),
    newTotalValue: numeric('new_total_value').notNull(),
    approvedBy: text('approved_by').references(() => user.id),
    approvedAt: timestamp('approved_at'),
    // Phase 5: CO Workflow
    status: text('status').default('DRAFT'), // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
    requestedBy: text('requested_by').references(() => user.id),
    requestedAt: timestamp('requested_at').defaultNow(),
    affectedMilestoneIds: jsonb('affected_milestone_ids').$type<string[]>(),
    scopeChange: text('scope_change'), // Description of scope impact
    scheduleImpactDays: integer('schedule_impact_days').default(0),
    rejectionReason: text('rejection_reason'),
    // Phase 5 Revised - Client-Driven CO
    changeOrderType: text('change_order_type').default('ADDITION'), // ADDITION, OMISSION
    clientInstructionId: uuid('client_instruction_id').references(() => clientInstruction.id),
    affectedBoqItemIds: jsonb('affected_boq_item_ids').$type<string[]>(), // BOQ items affected
});

export const financialLedger = pgTable('financial_ledger', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id),
    invoiceId: uuid('invoice_id').references(() => invoice.id),
    transactionType: text('transaction_type').notNull(), // INVOICE, PAYMENT, ADJUSTMENT, CO_ADJUSTMENT
    amount: numeric('amount').notNull(),
    status: ledgerStatusEnum('status').default('PENDING'),
    // Phase 5: Enhanced tracking
    changeOrderId: uuid('change_order_id').references(() => changeOrder.id),
    milestoneId: uuid('milestone_id').references(() => milestone.id),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    paymentMethod: text('payment_method'), // BANK_TRANSFER, CHECK, WIRE, etc.
    externalReference: text('external_reference'), // ERP transaction ID
    notes: text('notes'),
});

// --- 9.5. MILESTONE PAYMENTS (Phase 5) ---

export const milestonePayment = pgTable('milestone_payment', {
    ...baseColumns,
    milestoneId: uuid('milestone_id').references(() => milestone.id).notNull(),
    invoiceId: uuid('invoice_id').references(() => invoice.id),
    approvedAmount: numeric('approved_amount'),
    paidAmount: numeric('paid_amount').default('0'),
    retainedAmount: numeric('retained_amount').default('0'),
    status: text('status').default('NOT_STARTED'), // NOT_STARTED, APPROVED, INVOICED, PARTIALLY_PAID, PAID, OVERDUE
    approvedAt: timestamp('approved_at'),
    approvedBy: text('approved_by').references(() => user.id),
    dueDate: timestamp('due_date'),
    paidAt: timestamp('paid_at'),
    notes: text('notes'),
});

// --- 11. OFFLINE SYNC (PWA) ---

export const deviceSession = pgTable('device_session', {
    ...baseColumns,
    userId: text('user_id').references(() => user.id).notNull(),
    deviceId: text('device_id').notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    fcmToken: text('fcm_token'), // For push notifications
});

export const syncQueue = pgTable('sync_queue', {
    ...baseColumns,
    deviceSessionId: uuid('device_session_id').references(() => deviceSession.id).notNull(),
    entityTable: text('entity_table').notNull(),
    entityId: uuid('entity_id').notNull(),
    operation: text('operation').notNull(),
    payload: text('payload').notNull(),
    status: text('status').default('PENDING'),
    errorMessage: text('error_message'),
});

// --- 12. AUDIT, LOGS & SYSTEM ---

export const auditLog = pgTable('audit_log', {
    ...baseColumns,
    userId: text('user_id').references(() => user.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    metadata: text('metadata'), // JSON
    ipAddress: text('ip_address'),
});

export const notification = pgTable('notification', {
    ...baseColumns,
    userId: text('user_id').references(() => user.id),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').default('INFO'),
    readAt: timestamp('read_at'),
    linkUrl: text('link_url'),
    link: text('link'),
    metadata: jsonb('metadata'),
});

export const integrationKey = pgTable('integration_key', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    provider: text('provider').notNull(), // OPENAI, S3, RESEND
    encryptedKey: text('encrypted_key').notNull(),
    isActive: boolean('is_active').default(true),
});

// --- Phase 6: COMMENTING SYSTEM ---

export const comment = pgTable('comment', {
    ...baseColumns,
    parentType: commentParentTypeEnum('parent_type').notNull(),
    parentId: uuid('parent_id').notNull(),

    userId: text('user_id').references(() => user.id).notNull(),
    userRole: text('user_role').notNull(), // SUPPLIER, PM, QA_QC

    content: text('content').notNull(),
    version: integer('version').default(1),
    previousVersionId: uuid('previous_version_id'),
    isEdited: boolean('is_edited').default(false),
    editedAt: timestamp('edited_at'),
}, (t) => ({
    parentIdx: index('comment_parent_idx').on(t.parentType, t.parentId),
}));

// --- Phase 6: SYSTEM CONFIGURATION ---

export const systemConfig = pgTable('system_config', {
    ...baseColumns,
    organizationId: uuid('organization_id').references(() => organization.id), // null = global default

    configKey: text('config_key').notNull(),
    configValue: text('config_value').notNull(),
    configType: text('config_type').notNull(), // NUMBER, BOOLEAN, STRING, JSON
    description: text('description'),
}, (t) => ({
    keyOrgIdx: uniqueIndex('config_key_org_idx').on(t.organizationId, t.configKey),
}));

// --- Phase 6: SUPPLIER ACCURACY TRACKING ---

export const supplierAccuracy = pgTable('supplier_accuracy', {
    ...baseColumns,
    supplierId: uuid('supplier_id').references(() => supplier.id).notNull(),

    // Accuracy metrics
    totalShipments: integer('total_shipments').default(0),
    onTimeDeliveries: integer('on_time_deliveries').default(0),
    lateDeliveries: integer('late_deliveries').default(0),
    accuracyScore: numeric('accuracy_score').default('0'), // 0-100

    // Auto-accept policy
    autoAcceptEnabled: boolean('auto_accept_enabled').default(false),
    autoAcceptThreshold: numeric('auto_accept_threshold').default('90'), // Min accuracy score for auto-accept

    lastCalculatedAt: timestamp('last_calculated_at').defaultNow(),
});

// --- RELATIONS ---


export const organizationRelations = relations(organization, ({ many }) => ({
    projects: many(project),
    users: many(user), // This might be legacy direct relation if previously defined, or maybe incorrect inference. 
    // better to rely on members for mapping users to orgs if many-to-many or one-to-many via explicit table
    members: many(member),
    suppliers: many(supplier),
}));

export const memberRelations = relations(member, ({ one }) => ({
    organization: one(organization, { fields: [member.organizationId], references: [organization.id] }),
    user: one(user, { fields: [member.userId], references: [user.id] }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
    organization: one(organization, { fields: [invitation.organizationId], references: [organization.id] }),
    supplier: one(supplier, { fields: [invitation.supplierId], references: [supplier.id] }),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
    organization: one(organization, { fields: [project.organizationId], references: [organization.id] }),
    projectUsers: many(projectUser),
    purchaseOrders: many(purchaseOrder),
    deliveries: many(delivery),
}));

export const userRelations = relations(user, ({ one, many }) => ({
    organization: one(organization, { fields: [user.organizationId], references: [organization.id] }), // Legacy direct link
    supplier: one(supplier, { fields: [user.supplierId], references: [supplier.id] }),
    memberships: many(member), // New Org memberships
    projectMemberships: many(projectUser),
    sessions: many(session),
    accounts: many(account),
    twoFactor: one(twoFactor),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const supplierRelations = relations(supplier, ({ one, many }) => ({
    organization: one(organization, { fields: [supplier.organizationId], references: [organization.id] }),
    documents: many(supplierDocument),
    purchaseOrders: many(purchaseOrder),
    invoices: many(invoice),
}));

export const purchaseOrderRelations = relations(purchaseOrder, ({ one, many }) => ({
    project: one(project, { fields: [purchaseOrder.projectId], references: [project.id] }),
    supplier: one(supplier, { fields: [purchaseOrder.supplierId], references: [supplier.id] }),
    versions: many(poVersion),
    boqItems: many(boqItem),
    milestones: many(milestone),
    shipments: many(shipment),
    invoices: many(invoice),
    conflicts: many(conflictRecord),
    organization: one(organization, { fields: [purchaseOrder.organizationId], references: [organization.id] }),
}));

export const poVersionRelations = relations(poVersion, ({ one }) => ({
    purchaseOrder: one(purchaseOrder, { fields: [poVersion.purchaseOrderId], references: [purchaseOrder.id] }),
}));

export const boqItemRelations = relations(boqItem, ({ one, many }) => ({
    purchaseOrder: one(purchaseOrder, { fields: [boqItem.purchaseOrderId], references: [purchaseOrder.id] }),
    deliveryItems: many(deliveryItem),
}));

export const milestoneRelations = relations(milestone, ({ one, many }) => ({
    purchaseOrder: one(purchaseOrder, { fields: [milestone.purchaseOrderId], references: [purchaseOrder.id] }),
    progressRecords: many(progressRecord),
    payments: many(milestonePayment),
    invoices: many(invoice),
}));

export const progressRecordRelations = relations(progressRecord, ({ one }) => ({
    milestone: one(milestone, { fields: [progressRecord.milestoneId], references: [milestone.id] }),
    sourceUser: one(user, { fields: [progressRecord.reportedBy], references: [user.id] }),
    evidenceBundle: one(evidenceBundle),
}));

export const evidenceBundleRelations = relations(evidenceBundle, ({ one, many }) => ({
    progressRecord: one(progressRecord, { fields: [evidenceBundle.progressRecordId], references: [progressRecord.id] }),
    files: many(evidenceFile),
}));

export const supplierDocumentRelations = relations(supplierDocument, ({ one }) => ({
    supplier: one(supplier, { fields: [supplierDocument.supplierId], references: [supplier.id] }),
}));

export const projectUserRelations = relations(projectUser, ({ one }) => ({
    project: one(project, { fields: [projectUser.projectId], references: [project.id] }),
    user: one(user, { fields: [projectUser.userId], references: [user.id] }),
}));

export const documentRelations = relations(document, ({ one, many }) => ({
    organization: one(organization, { fields: [document.organizationId], references: [organization.id] }),
    project: one(project, { fields: [document.projectId], references: [project.id] }),
    uploader: one(user, { fields: [document.uploadedBy], references: [user.id] }),
    extractions: many(documentExtraction),
}));

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
    supplier: one(supplier, { fields: [invoice.supplierId], references: [supplier.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [invoice.purchaseOrderId], references: [purchaseOrder.id] }),
    milestone: one(milestone, { fields: [invoice.milestoneId], references: [milestone.id] }),
    document: one(document, { fields: [invoice.documentId], references: [document.id] }),
    items: many(invoiceItem),
}));

export const invoiceItemRelations = relations(invoiceItem, ({ one }) => ({
    invoice: one(invoice, { fields: [invoiceItem.invoiceId], references: [invoice.id] }),
    boqItem: one(boqItem, { fields: [invoiceItem.boqItemId], references: [boqItem.id] }),
}));

export const shipmentRelations = relations(shipment, ({ one, many }) => ({
    purchaseOrder: one(purchaseOrder, { fields: [shipment.purchaseOrderId], references: [purchaseOrder.id] }),
    supplier: one(supplier, { fields: [shipment.supplierId], references: [supplier.id] }),
    boqItem: one(boqItem, { fields: [shipment.boqItemId], references: [boqItem.id] }),
    packingListDoc: one(document, { fields: [shipment.packingListDocId], references: [document.id] }),
    cmrDoc: one(document, { fields: [shipment.cmrDocId], references: [document.id] }),
    packingLists: many(packingList),
    events: many(shipmentEvent),
    deliveryReceipts: many(deliveryReceipt),
}));

export const shipmentEventRelations = relations(shipmentEvent, ({ one }) => ({
    shipment: one(shipment, { fields: [shipmentEvent.shipmentId], references: [shipment.id] }),
}));

export const deliveryReceiptRelations = relations(deliveryReceipt, ({ one, many }) => ({
    shipment: one(shipment, { fields: [deliveryReceipt.shipmentId], references: [shipment.id] }),
    delivery: one(delivery, { fields: [deliveryReceipt.deliveryId], references: [delivery.id] }),
    receiver: one(user, { fields: [deliveryReceipt.receivedBy], references: [user.id] }),
    qaTasks: many(qaInspectionTask),
}));

export const qaInspectionTaskRelations = relations(qaInspectionTask, ({ one }) => ({
    deliveryReceipt: one(deliveryReceipt, { fields: [qaInspectionTask.deliveryReceiptId], references: [deliveryReceipt.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [qaInspectionTask.purchaseOrderId], references: [purchaseOrder.id] }),
    assignee: one(user, { fields: [qaInspectionTask.assignedTo], references: [user.id] }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
    user: one(user, { fields: [comment.userId], references: [user.id] }),
}));

export const systemConfigRelations = relations(systemConfig, ({ one }) => ({
    organization: one(organization, { fields: [systemConfig.organizationId], references: [organization.id] }),
}));

export const supplierAccuracyRelations = relations(supplierAccuracy, ({ one }) => ({
    supplier: one(supplier, { fields: [supplierAccuracy.supplierId], references: [supplier.id] }),
}));


export const packingListRelations = relations(packingList, ({ one }) => ({
    shipment: one(shipment, { fields: [packingList.shipmentId], references: [shipment.id] }),
    document: one(document, { fields: [packingList.documentId], references: [document.id] }),
}));

export const deliveryRelations = relations(delivery, ({ one, many }) => ({
    project: one(project, { fields: [delivery.projectId], references: [project.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [delivery.purchaseOrderId], references: [purchaseOrder.id] }),
    shipment: one(shipment, { fields: [delivery.shipmentId], references: [shipment.id] }),
    receiver: one(user, { fields: [delivery.receivedBy], references: [user.id] }),
    items: many(deliveryItem),
}));


export const deliveryItemRelations = relations(deliveryItem, ({ one }) => ({
    delivery: one(delivery, { fields: [deliveryItem.deliveryId], references: [delivery.id] }),
    boqItem: one(boqItem, { fields: [deliveryItem.boqItemId], references: [boqItem.id] }),
}));

export const evidenceFileRelations = relations(evidenceFile, ({ one }) => ({
    bundle: one(evidenceBundle, { fields: [evidenceFile.evidenceBundleId], references: [evidenceBundle.id] }),
    document: one(document, { fields: [evidenceFile.documentId], references: [document.id] }),
}));

export const conflictRecordRelations = relations(conflictRecord, ({ one }) => ({
    project: one(project, { fields: [conflictRecord.projectId], references: [project.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [conflictRecord.purchaseOrderId], references: [purchaseOrder.id] }),
    milestone: one(milestone, { fields: [conflictRecord.milestoneId], references: [milestone.id] }),
    assignee: one(user, { fields: [conflictRecord.assignedTo], references: [user.id] }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
    user: one(user, { fields: [notification.userId], references: [user.id] }),
}));

export const deviceSessionRelations = relations(deviceSession, ({ one, many }) => ({
    user: one(user, { fields: [deviceSession.userId], references: [user.id] }),
    syncQueues: many(syncQueue),
}));

export const syncQueueRelations = relations(syncQueue, ({ one }) => ({
    deviceSession: one(deviceSession, { fields: [syncQueue.deviceSessionId], references: [deviceSession.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
    user: one(user, { fields: [auditLog.userId], references: [user.id] }),
}));

export const integrationKeyRelations = relations(integrationKey, ({ one }) => ({
    project: one(project, { fields: [integrationKey.projectId], references: [project.id] }),
}));

export const riskProfileRelations = relations(riskProfile, ({ one }) => ({
    supplier: one(supplier, { fields: [riskProfile.supplierId], references: [supplier.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [riskProfile.purchaseOrderId], references: [purchaseOrder.id] }),
}));

export const confidenceScoreRelations = relations(confidenceScore, ({ one }) => ({
    progressRecord: one(progressRecord, { fields: [confidenceScore.progressRecordId], references: [progressRecord.id] }),
}));

// --- Phase 5: Advanced Ingestion Relations ---

export const emailIngestionRelations = relations(emailIngestion, ({ one, many }) => ({
    organization: one(organization, { fields: [emailIngestion.organizationId], references: [organization.id] }),
    matchedSupplier: one(supplier, { fields: [emailIngestion.matchedSupplierId], references: [supplier.id] }),
    matchedPo: one(purchaseOrder, { fields: [emailIngestion.matchedPoId], references: [purchaseOrder.id] }),
    attachments: many(emailAttachment),
}));

export const emailAttachmentRelations = relations(emailAttachment, ({ one }) => ({
    emailIngestion: one(emailIngestion, { fields: [emailAttachment.emailIngestionId], references: [emailIngestion.id] }),
    document: one(document, { fields: [emailAttachment.documentId], references: [document.id] }),
    extraction: one(documentExtraction, { fields: [emailAttachment.extractionId], references: [documentExtraction.id] }),
}));

export const externalSyncRelations = relations(externalSync, ({ one, many }) => ({
    organization: one(organization, { fields: [externalSync.organizationId], references: [organization.id] }),
    targetProject: one(project, { fields: [externalSync.targetProjectId], references: [project.id] }),
    logs: many(syncLog),
}));

export const syncLogRelations = relations(syncLog, ({ one }) => ({
    externalSync: one(externalSync, { fields: [syncLog.externalSyncId], references: [externalSync.id] }),
}));

export const usageQuotaRelations = relations(usageQuota, ({ one }) => ({
    organization: one(organization, { fields: [usageQuota.organizationId], references: [organization.id] }),
}));

export const usageEventRelations = relations(usageEvent, ({ one }) => ({
    organization: one(organization, { fields: [usageEvent.organizationId], references: [organization.id] }),
}));

// --- Phase 5: Progress, Payment & Change Order Relations ---

export const milestonePaymentRelations = relations(milestonePayment, ({ one }) => ({
    milestone: one(milestone, { fields: [milestonePayment.milestoneId], references: [milestone.id] }),
    invoice: one(invoice, { fields: [milestonePayment.invoiceId], references: [invoice.id] }),
    approver: one(user, { fields: [milestonePayment.approvedBy], references: [user.id] }),
}));

export const changeOrderRelations = relations(changeOrder, ({ one }) => ({
    purchaseOrder: one(purchaseOrder, { fields: [changeOrder.purchaseOrderId], references: [purchaseOrder.id] }),
    approver: one(user, { fields: [changeOrder.approvedBy], references: [user.id] }),
    requester: one(user, { fields: [changeOrder.requestedBy], references: [user.id] }),
    clientInstruction: one(clientInstruction, { fields: [changeOrder.clientInstructionId], references: [clientInstruction.id] }),
}));

export const clientInstructionRelations = relations(clientInstruction, ({ one, many }) => ({
    project: one(project, { fields: [clientInstruction.projectId], references: [project.id] }),
    approver: one(user, { fields: [clientInstruction.approvedBy], references: [user.id] }),
    changeOrders: many(changeOrder),
}));

export const financialLedgerRelations = relations(financialLedger, ({ one }) => ({
    project: one(project, { fields: [financialLedger.projectId], references: [project.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [financialLedger.purchaseOrderId], references: [purchaseOrder.id] }),
    invoice: one(invoice, { fields: [financialLedger.invoiceId], references: [invoice.id] }),
    changeOrder: one(changeOrder, { fields: [financialLedger.changeOrderId], references: [changeOrder.id] }),
    milestone: one(milestone, { fields: [financialLedger.milestoneId], references: [milestone.id] }),
}));

// --- Phase 7: NCR Relations ---

export const ncrRelations = relations(ncr, ({ one, many }) => ({
    organization: one(organization, { fields: [ncr.organizationId], references: [organization.id] }),
    project: one(project, { fields: [ncr.projectId], references: [project.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [ncr.purchaseOrderId], references: [purchaseOrder.id] }),
    supplier: one(supplier, { fields: [ncr.supplierId], references: [supplier.id] }),
    affectedBoqItem: one(boqItem, { fields: [ncr.affectedBoqItemId], references: [boqItem.id] }),
    qaInspectionTask: one(qaInspectionTask, { fields: [ncr.qaInspectionTaskId], references: [qaInspectionTask.id] }),
    sourceDocument: one(document, {
        fields: [ncr.sourceDocumentId],
        references: [document.id],
        relationName: "ncrSourceDocument",
    }),
    proofOfFixDoc: one(document, {
        fields: [ncr.proofOfFixDocId],
        references: [document.id],
        relationName: "ncrProofOfFix",
    }),
    creditNoteDoc: one(document, {
        fields: [ncr.creditNoteDocId],
        references: [document.id],
        relationName: "ncrCreditNote",
    }),
    reporter: one(user, {
        fields: [ncr.reportedBy],
        references: [user.id],
        relationName: "ncrReporter",
    }),
    assignee: one(user, {
        fields: [ncr.assignedTo],
        references: [user.id],
        relationName: "ncrAssignee",
    }),
    closer: one(user, {
        fields: [ncr.closedBy],
        references: [user.id],
        relationName: "ncrCloser",
    }),
    comments: many(ncrComment),
    attachments: many(ncrAttachment),
    magicLinks: many(ncrMagicLink),
}));

export const ncrCommentRelations = relations(ncrComment, ({ one }) => ({
    ncr: one(ncr, { fields: [ncrComment.ncrId], references: [ncr.id] }),
    user: one(user, { fields: [ncrComment.userId], references: [user.id] }),
}));

export const ncrAttachmentRelations = relations(ncrAttachment, ({ one }) => ({
    ncr: one(ncr, { fields: [ncrAttachment.ncrId], references: [ncr.id] }),
    uploader: one(user, { fields: [ncrAttachment.uploadedBy], references: [user.id] }),
}));

export const ncrMagicLinkRelations = relations(ncrMagicLink, ({ one }) => ({
    ncr: one(ncr, { fields: [ncrMagicLink.ncrId], references: [ncr.id] }),
    supplier: one(supplier, { fields: [ncrMagicLink.supplierId], references: [supplier.id] }),
}));
