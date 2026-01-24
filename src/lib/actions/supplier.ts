'use server';

import db from "@/db/drizzle";
import {

    supplier,
    member,
    purchaseOrder,
    invoice,
    supplierDocument,
    milestone,
    boqItem,
    poVersion,
    financialLedger,
    milestonePayment,
    progressRecord,
    changeOrder,
    emailIngestion,
    invoiceItem,
    shipment,
    delivery,
    deliveryItem,
    packingList,
    conflictRecord,
    ncr,
    ncrComment,
    evidenceBundle,
    evidenceFile,
    confidenceScore,
    riskProfile,
    emailAttachment,
    document,
    documentExtraction,
    invitation,
    organization
} from "@/db/schema";

import { auth } from "@/auth";
import { headers } from "next/headers";
import { eq, inArray, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from 'xlsx';
import { Resend } from "resend";
import { render } from "@react-email/render";
import SupplierRemovedEmail from "@/emails/supplier-removed-email";
import { getActiveOrganizationId } from "@/lib/utils/org-context";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to get all organization IDs for the user
async function getUserOrganizationIds(userId: string): Promise<string[]> {
    const memberships = await db.query.member.findMany({
        where: eq(member.userId, userId),
        columns: { organizationId: true }
    });
    return memberships.map(m => m.organizationId);
}

export async function getSuppliers() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return [];
    }

    // Use active organization context
    const activeOrgId = await getActiveOrganizationId();
    
    if (activeOrgId) {
        return await db.select().from(supplier).where(eq(supplier.organizationId, activeOrgId));
    }

    // Fallback to all orgs
    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return [];
    }

    return await db.select().from(supplier).where(inArray(supplier.organizationId, orgIds));
}

export async function importSuppliers(formData: FormData) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized: No session" };
    }

    // Use active organization for import
    const activeOrgId = await getActiveOrganizationId();
    const orgId = activeOrgId || (await getUserOrganizationIds(session.user.id))[0];
    
    if (!orgId) {
        return { success: false, error: "Unauthorized: You must be a member of an organization first." };
    }

    const file = formData.get("file") as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            return { success: false, error: "Empty file or invalid format" };
        }

        const suppliersToInsert = data.map((row: any) => ({
            organizationId: orgId,
            name: row['Supplier Name'] || row['name'] || row['Name'],
            contactEmail: row['Contact Email'] || row['email'] || row['Email'],
            taxId: row['Tax ID'] || row['tax_id'] || row['TaxId'],
            status: 'INACTIVE' // Default status for imported suppliers
        })).filter(s => s.name); // Ensure name exists

        if (suppliersToInsert.length === 0) {
            return { success: false, error: "No valid suppliers found in file. Ensure columns are 'Supplier Name', 'Contact Email', etc." };
        }

        await db.insert(supplier).values(suppliersToInsert);

        revalidatePath("/dashboard/suppliers");
        return { success: true, count: suppliersToInsert.length };

    } catch (error) {
        console.error("Import error:", error);
        return { success: false, error: "Failed to parse file" };
    }
}

import { performInvitation } from "./invitation";

// Schema for creating a single supplier
interface CreateSupplierInput {
    name: string;
    contactEmail?: string;
    taxId?: string;
    inviteNow?: boolean;
}

/**
 * Create a single supplier manually
 */
export async function createSupplier(input: CreateSupplierInput) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    const orgId = orgIds[0];
    if (!orgId) {
        return { success: false, error: "You must be a member of an organization first." };
    }

    if (!input.name || input.name.trim().length === 0) {
        return { success: false, error: "Supplier name is required" };
    }

    const trimmedEmail = input.contactEmail?.trim();

    try {
        const [newSupplier] = await db.insert(supplier).values({
            organizationId: orgId,
            name: input.name.trim(),
            contactEmail: trimmedEmail || null,
            taxId: input.taxId?.trim() || null,
            status: 'INACTIVE',
        }).returning();

        // Automatically invite if email is provided
        if (trimmedEmail) {
            const inviteResult = await performInvitation({
                orgId,
                email: trimmedEmail,
                role: "SUPPLIER",
                supplierId: newSupplier.id,
                inviterName: session.user.name || "A team member"
            });

            if (!inviteResult.success) {
                // We created the supplier but failed to invite. 
                // Return success but with a warning.
                return {
                    success: true,
                    supplier: newSupplier,
                    warning: `Supplier created, but invitation failed: ${inviteResult.error}`
                };
            }
        }

        revalidatePath("/dashboard/suppliers");
        revalidatePath("/dashboard/procurement/new");

        return { success: true, supplier: newSupplier, invited: !!trimmedEmail };
    } catch (error) {
        console.error("[createSupplier] Error:", error);
        return { success: false, error: "Failed to create supplier" };
    }
}

/**
 * Bulk invite all suppliers that have emails but haven't been invited yet
 */
export async function bulkInviteSuppliers() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return { success: false, error: "You must be a member of an organization." };
    }

    try {
        // Get all inactive suppliers with valid emails
        const pendingSuppliers = await db
            .select()
            .from(supplier)
            .where(inArray(supplier.organizationId, orgIds));

        const toInvite = pendingSuppliers.filter(
            s => s.status === 'INACTIVE' && s.contactEmail && s.contactEmail.includes('@')
        );

        if (toInvite.length === 0) {
            return { success: false, error: "No pending suppliers with valid emails to invite." };
        }

        let successCount = 0;
        let failCount = 0;

        for (const s of toInvite) {
            try {
                const inviteResult = await performInvitation({
                    orgId: s.organizationId,
                    email: s.contactEmail!,
                    role: "SUPPLIER",
                    supplierId: s.id,
                    inviterName: session.user.name || "A team member"
                });

                if (inviteResult.success) {
                    // Update status
                    await db.update(supplier)
                        .set({ status: 'INVITED' })
                        .where(eq(supplier.id, s.id));
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to invite ${s.contactEmail}:`, err);
                failCount++;
            }
        }

        revalidatePath("/dashboard/suppliers");

        return {
            success: true,
            invited: successCount,
            failed: failCount,
            total: toInvite.length
        };
    } catch (error) {
        console.error("[bulkInviteSuppliers] Error:", error);
        return { success: false, error: "Failed to process bulk invitations" };
    }
}

/**
 * Delete a supplier by ID - CASCADE deletes all related records
 */
export async function deleteSupplier(supplierId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return { success: false, error: "You must be a member of an organization." };
    }

    try {
        // Verify supplier belongs to user's org
        const [existing] = await db
            .select()
            .from(supplier)
            .where(eq(supplier.id, supplierId));

        if (!existing || !orgIds.includes(existing.organizationId)) {
            return { success: false, error: "Supplier not found" };
        }

        // Capture supplier details for email notification BEFORE deletion
        const supplierEmail = existing.contactEmail;
        const supplierName = existing.name;
        const organizationId = existing.organizationId;

        // Get organization name for the email
        const org = await db.query.organization.findFirst({
            where: eq(organization.id, organizationId),
            columns: { name: true }
        });
        const orgName = org?.name || "the organization";

        // Get all POs for this supplier to cascade delete their children
        const supplierPOs = await db
            .select({ id: purchaseOrder.id })
            .from(purchaseOrder)
            .where(eq(purchaseOrder.supplierId, supplierId));

        const poIds = supplierPOs.map(po => po.id);

        // Invoices
        const supplierInvoices = await db.select({ id: invoice.id }).from(invoice).where(eq(invoice.supplierId, supplierId));
        const invoiceIds = supplierInvoices.map(inv => inv.id);

        // Milestones
        let milestoneIds: string[] = [];
        if (poIds.length > 0) {
            const poMilestones = await db.select({ id: milestone.id }).from(milestone).where(inArray(milestone.purchaseOrderId, poIds));
            milestoneIds = poMilestones.map(m => m.id);
        }

        // Progress Records
        let progressRecordIds: string[] = [];
        if (milestoneIds.length > 0) {
            const mProgress = await db.select({ id: progressRecord.id }).from(progressRecord).where(inArray(progressRecord.milestoneId, milestoneIds));
            progressRecordIds = mProgress.map(p => p.id);
        }

        // Evidence Bundles
        let evidenceBundleIds: string[] = [];
        if (progressRecordIds.length > 0) {
            const pBundles = await db.select({ id: evidenceBundle.id }).from(evidenceBundle).where(inArray(evidenceBundle.progressRecordId, progressRecordIds));
            evidenceBundleIds = pBundles.map(b => b.id);
        }

        // Shipments
        let shipmentIds: string[] = [];
        if (poIds.length > 0) {
            const poShipments = await db.select({ id: shipment.id }).from(shipment).where(inArray(shipment.purchaseOrderId, poIds));
            shipmentIds = poShipments.map(s => s.id);
        }

        // Deliveries
        let deliveryIds: string[] = [];
        if (poIds.length > 0) {
            const poDeliveries = await db.select({ id: delivery.id }).from(delivery).where(inArray(delivery.purchaseOrderId, poIds));
            deliveryIds = poDeliveries.map(d => d.id);
        }

        // Change Orders
        let changeOrderIds: string[] = [];
        if (poIds.length > 0) {
            const poCOs = await db.select({ id: changeOrder.id }).from(changeOrder).where(inArray(changeOrder.purchaseOrderId, poIds));
            changeOrderIds = poCOs.map(co => co.id);
        }

        // NCRs
        let ncrIds: string[] = [];
        if (poIds.length > 0) {
            const poNCRs = await db.select({ id: ncr.id }).from(ncr).where(inArray(ncr.purchaseOrderId, poIds));
            ncrIds = poNCRs.map(n => n.id);
        }

        // Email Ingestions (Matched to supplier or POs)
        const ingestionQuery = poIds.length > 0
            ? or(eq(emailIngestion.matchedSupplierId, supplierId), inArray(emailIngestion.matchedPoId, poIds))
            : eq(emailIngestion.matchedSupplierId, supplierId);

        if (!ingestionQuery) {
            throw new Error("Failed to construct ingestion query");
        }

        const matchedEmailIngestions = await db.select({ id: emailIngestion.id }).from(emailIngestion).where(ingestionQuery);
        const emailIngestionIds = matchedEmailIngestions.map(ei => ei.id);

        // Email Attachments
        let emailAttachmentIds: string[] = [];
        if (emailIngestionIds.length > 0) {
            const eAttachments = await db.select({ id: emailAttachment.id }).from(emailAttachment).where(inArray(emailAttachment.emailIngestionId, emailIngestionIds));
            emailAttachmentIds = eAttachments.map(ea => ea.id);
        }

        // Documents (Linked to supplier, POs, Invoices, NCRs, etc.)
        const documentParentIds = [supplierId, ...poIds, ...invoiceIds, ...ncrIds, ...evidenceBundleIds].filter(Boolean);
        let documentIds: string[] = [];
        if (documentParentIds.length > 0) {
            const supplierDocs = await db.select({ id: document.id }).from(document).where(inArray(document.parentId, documentParentIds as string[]));
            documentIds = supplierDocs.map(d => d.id);
        }

        // Document Extractions
        let extractionIds: string[] = [];
        if (documentIds.length > 0) {
            const dExtractions = await db.select({ id: documentExtraction.id }).from(documentExtraction).where(inArray(documentExtraction.documentId, documentIds));
            extractionIds = dExtractions.map(e => e.id);
        }

        // --- 2. CASCADE DELETE (DEEPEST CHILDREN FIRST) ---

        // Evidence files & bundles
        if (evidenceBundleIds.length > 0) {
            await db.delete(evidenceFile).where(inArray(evidenceFile.evidenceBundleId, evidenceBundleIds));
            await db.delete(evidenceBundle).where(inArray(evidenceBundle.id, evidenceBundleIds));
        }

        // Progress stats
        if (progressRecordIds.length > 0) {
            await db.delete(confidenceScore).where(inArray(confidenceScore.progressRecordId, progressRecordIds));
            await db.delete(progressRecord).where(inArray(progressRecord.id, progressRecordIds));
        }

        // Logistics children
        if (shipmentIds.length > 0) {
            await db.delete(packingList).where(inArray(packingList.shipmentId, shipmentIds));
            await db.delete(shipment).where(inArray(shipment.id, shipmentIds));
        }
        if (deliveryIds.length > 0) {
            await db.delete(deliveryItem).where(inArray(deliveryItem.deliveryId, deliveryIds));
            await db.delete(delivery).where(inArray(delivery.id, deliveryIds));
        }

        // Quality children
        if (ncrIds.length > 0) {
            await db.delete(ncrComment).where(inArray(ncrComment.ncrId, ncrIds));
            await db.delete(ncr).where(inArray(ncr.id, ncrIds));
        }

        // Financial children
        if (invoiceIds.length > 0) {
            await db.delete(milestonePayment).where(inArray(milestonePayment.invoiceId, invoiceIds));
            await db.delete(financialLedger).where(inArray(financialLedger.invoiceId, invoiceIds));
            await db.delete(invoiceItem).where(inArray(invoiceItem.invoiceId, invoiceIds));
            await db.delete(invoice).where(inArray(invoice.id, invoiceIds));
        }

        // Remaining Financial/PO children
        if (changeOrderIds.length > 0) {
            await db.delete(financialLedger).where(inArray(financialLedger.changeOrderId, changeOrderIds));
            await db.delete(changeOrder).where(inArray(changeOrder.id, changeOrderIds));
        }

        if (milestoneIds.length > 0) {
            await db.delete(milestonePayment).where(inArray(milestonePayment.milestoneId, milestoneIds));
            await db.delete(financialLedger).where(inArray(financialLedger.milestoneId, milestoneIds));
            await db.delete(conflictRecord).where(inArray(conflictRecord.milestoneId, milestoneIds));
            await db.delete(milestone).where(inArray(milestone.id, milestoneIds));
        }

        // --- EMAIL INGESTION (MUST be deleted BEFORE purchase_order due to matchedPoId FK) ---
        if (emailAttachmentIds.length > 0) {
            await db.delete(emailAttachment).where(inArray(emailAttachment.id, emailAttachmentIds));
        }
        if (emailIngestionIds.length > 0) {
            await db.delete(emailIngestion).where(inArray(emailIngestion.id, emailIngestionIds));
        }

        // --- PURCHASE ORDER & CHILDREN ---
        if (poIds.length > 0) {
            await db.delete(conflictRecord).where(inArray(conflictRecord.purchaseOrderId, poIds));
            await db.delete(boqItem).where(inArray(boqItem.purchaseOrderId, poIds));
            await db.delete(poVersion).where(inArray(poVersion.purchaseOrderId, poIds));
            await db.delete(riskProfile).where(inArray(riskProfile.purchaseOrderId, poIds));
            await db.delete(purchaseOrder).where(inArray(purchaseOrder.id, poIds));
        }

        // --- DOCUMENT RECORDS ---
        if (extractionIds.length > 0) {
            await db.delete(documentExtraction).where(inArray(documentExtraction.id, extractionIds));
        }
        if (documentIds.length > 0) {
            await db.delete(document).where(inArray(document.id, documentIds));
        }


        // Phase D: Supplier Documents & Supplier Root
        await db.delete(riskProfile).where(eq(riskProfile.supplierId, supplierId));
        await db.delete(supplierDocument).where(eq(supplierDocument.supplierId, supplierId));

        // Delete invitations linked to this supplier
        await db.delete(invitation).where(eq(invitation.supplierId, supplierId));

        // Finally delete the root supplier record
        await db.delete(supplier).where(eq(supplier.id, supplierId));

        revalidatePath("/dashboard/suppliers");
        revalidatePath("/dashboard/procurement");

        console.log(`[deleteSupplier] Success. Fully wiped supplier: ${supplierId}`);

        // Send removal notification email if supplier had an email
        if (supplierEmail) {
            try {
                const emailHtml = await render(
                    SupplierRemovedEmail({
                        supplierName: supplierName,
                        organizationName: orgName,
                    })
                );

                await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                    to: supplierEmail,
                    subject: `Your supplier account with ${orgName} has been removed`,
                    html: emailHtml
                });
                console.log(`[deleteSupplier] Removal notification sent to: ${supplierEmail}`);
            } catch (emailError) {
                // Don't fail the deletion if email fails
                console.error("[deleteSupplier] Failed to send removal email:", emailError);
            }
        }

        return { success: true, message: "Supplier and all related history wiped successfully" };
    } catch (error) {
        console.error("[deleteSupplier] Full Wipe Error:", error);
        return {
            success: false,
            error: "Failed to fully delete supplier records. There may be deep dependencies still active."
        };
    }
}

/**
 * Invite selected suppliers by their IDs
 */
export async function inviteSelectedSuppliers(supplierIds: string[]) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    if (!supplierIds || supplierIds.length === 0) {
        return { success: false, error: "No suppliers selected" };
    }

    const orgIds = await getUserOrganizationIds(session.user.id);
    if (orgIds.length === 0) {
        return { success: false, error: "You must be a member of an organization." };
    }

    try {
        // Get selected suppliers
        const selectedSuppliers = await db
            .select()
            .from(supplier)
            .where(inArray(supplier.id, supplierIds));

        // Filter to only ones in user's orgs with valid emails
        const toInvite = selectedSuppliers.filter(
            s => orgIds.includes(s.organizationId) &&
                s.status === 'INACTIVE' &&
                s.contactEmail &&
                s.contactEmail.includes('@')
        );

        if (toInvite.length === 0) {
            return { success: false, error: "No valid suppliers to invite" };
        }

        let successCount = 0;
        let failCount = 0;

        for (const s of toInvite) {
            try {
                const inviteResult = await performInvitation({
                    orgId: s.organizationId,
                    email: s.contactEmail!,
                    role: "SUPPLIER",
                    supplierId: s.id,
                    inviterName: session.user.name || "A team member"
                });

                if (inviteResult.success) {
                    await db.update(supplier)
                        .set({ status: 'INVITED' })
                        .where(eq(supplier.id, s.id));
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to invite ${s.contactEmail}:`, err);
                failCount++;
            }
        }

        revalidatePath("/dashboard/suppliers");

        return {
            success: true,
            invited: successCount,
            failed: failCount,
            total: toInvite.length
        };
    } catch (error) {
        console.error("[inviteSelectedSuppliers] Error:", error);
        return { success: false, error: "Failed to process invitations" };
    }
}

