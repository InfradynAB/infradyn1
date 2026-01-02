import { pgTable, uuid, text, timestamp, boolean, integer, numeric, pgEnum, uniqueIndex, check, index, jsonb } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'PM', 'SUPPLIER', 'QA', 'SITE_RECEIVER']);
export const parentTypeEnum = pgEnum('parent_type', ['PO', 'BOQ', 'INVOICE', 'PACKING_LIST', 'CMR', 'NCR', 'EVIDENCE']);
export const progressSourceEnum = pgEnum('progress_source', ['SRP', 'IRP', 'FORECAST']);
export const conflictTypeEnum = pgEnum('conflict_type', ['QUANTITY_MISMATCH', 'PROGRESS_MISMATCH', 'DATE_VARIANCE', 'EVIDENCE_FAILURE', 'NCR_CONFLICT']);
export const conflictStateEnum = pgEnum('conflict_state', ['OPEN', 'REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED']);
export const ncrSeverityEnum = pgEnum('ncr_severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ncrStatusEnum = pgEnum('ncr_status', ['OPEN', 'REVIEW', 'REMEDIATION', 'CLOSED']);
export const ledgerStatusEnum = pgEnum('ledger_status', ['COMMITTED', 'PAID', 'PENDING', 'CANCELLED']);
export const trustLevelEnum = pgEnum('trust_level', ['VERIFIED', 'INTERNAL', 'FORECAST']);
export const documentTypeEnum = pgEnum('document_type', ['INVOICE', 'PACKING_LIST', 'CMR', 'NCR_REPORT', 'EVIDENCE', 'PROGRESS_REPORT', 'OTHER']);

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
});

// --- 5. LOGISTICS & DELIVERY ---

export const shipment = pgTable('shipment', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    trackingNumber: text('tracking_number'),
    carrier: text('carrier'),
    eta: timestamp('eta'),
    status: text('status').default('IN_TRANSIT'),
});

export const packingList = pgTable('packing_list', {
    ...baseColumns,
    shipmentId: uuid('shipment_id').references(() => shipment.id).notNull(),
    documentId: uuid('document_id').references(() => document.id),
});

export const delivery = pgTable('delivery', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    shippingNoteNumber: text('shipping_note_number'),
    receivedDate: timestamp('received_date').defaultNow(),
    receivedBy: text('received_by').references(() => user.id),
});

export const deliveryItem = pgTable('delivery_item', {
    ...baseColumns,
    deliveryId: uuid('delivery_id').references(() => delivery.id).notNull(),
    boqItemId: uuid('boq_item_id').references(() => boqItem.id).notNull(),
    quantityDelivered: numeric('quantity_delivered').notNull(),
    condition: text('condition'),
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
    status: text('status').default('PENDING'),
    documentId: uuid('document_id').references(() => document.id),
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

export const changeOrder = pgTable('change_order', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    changeNumber: text('change_number').notNull(),
    reason: text('reason'),
    amountDelta: numeric('amount_delta').notNull(),
    newTotalValue: numeric('new_total_value').notNull(),
    approvedBy: text('approved_by').references(() => user.id),
    approvedAt: timestamp('approved_at'),
});

export const financialLedger = pgTable('financial_ledger', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id),
    invoiceId: uuid('invoice_id').references(() => invoice.id),
    transactionType: text('transaction_type').notNull(), // INVOICE, PAYMENT, ADJUSTMENT
    amount: numeric('amount').notNull(),
    status: ledgerStatusEnum('status').default('PENDING'),
});

// --- 10. QUALITY (NCR) ---

export const ncr = pgTable('ncr', {
    ...baseColumns,
    purchaseOrderId: uuid('purchase_order_id').references(() => purchaseOrder.id).notNull(),
    boqItemId: uuid('boq_item_id').references(() => boqItem.id), // Optional, could be general PO NCR
    title: text('title').notNull(),
    description: text('description').notNull(),
    severity: ncrSeverityEnum('severity').notNull(),
    status: ncrStatusEnum('status').default('OPEN').notNull(),
    raisedBy: text('raised_by').references(() => user.id).notNull(),
});

export const ncrComment = pgTable('ncr_comment', {
    ...baseColumns,
    ncrId: uuid('ncr_id').references(() => ncr.id).notNull(),
    userId: text('user_id').references(() => user.id).notNull(),
    content: text('content').notNull(),
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
    userId: text('user_id').references(() => user.id).notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').default('INFO'),
    readAt: timestamp('read_at'),
    linkUrl: text('link_url'),
});

export const integrationKey = pgTable('integration_key', {
    ...baseColumns,
    projectId: uuid('project_id').references(() => project.id).notNull(),
    provider: text('provider').notNull(), // OPENAI, S3, RESEND
    encryptedKey: text('encrypted_key').notNull(),
    isActive: boolean('is_active').default(true),
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
    items: many(invoiceItem),
}));

export const invoiceItemRelations = relations(invoiceItem, ({ one }) => ({
    invoice: one(invoice, { fields: [invoiceItem.invoiceId], references: [invoice.id] }),
    boqItem: one(boqItem, { fields: [invoiceItem.boqItemId], references: [boqItem.id] }),
}));

export const shipmentRelations = relations(shipment, ({ one, many }) => ({
    purchaseOrder: one(purchaseOrder, { fields: [shipment.purchaseOrderId], references: [purchaseOrder.id] }),
    packingLists: many(packingList),
}));

export const packingListRelations = relations(packingList, ({ one }) => ({
    shipment: one(shipment, { fields: [packingList.shipmentId], references: [shipment.id] }),
    document: one(document, { fields: [packingList.documentId], references: [document.id] }),
}));

export const deliveryRelations = relations(delivery, ({ one, many }) => ({
    project: one(project, { fields: [delivery.projectId], references: [project.id] }),
    purchaseOrder: one(purchaseOrder, { fields: [delivery.purchaseOrderId], references: [purchaseOrder.id] }),
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
