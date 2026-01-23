import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import db from "@/db/drizzle";
import { ncr, ncrComment, ncrMagicLink, auditLog } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: ncrId } = await params;

        // Get NCR with all relations
        const ncrData = await db.query.ncr.findFirst({
            where: eq(ncr.id, ncrId),
            with: {
                purchaseOrder: true,
                supplier: true,
                reporter: true,
                assignee: true,
                closer: true,
            },
        });

        if (!ncrData) {
            return NextResponse.json({ error: "NCR not found" }, { status: 404 });
        }

        // Get all comments
        const comments = await db.query.ncrComment.findMany({
            where: eq(ncrComment.ncrId, ncrId),
            orderBy: [desc(ncrComment.createdAt)],
            with: { user: true },
        });

        // Get magic link activity
        const magicLinks = await db.query.ncrMagicLink.findMany({
            where: eq(ncrMagicLink.ncrId, ncrId),
            orderBy: [desc(ncrMagicLink.createdAt)],
        });

        // Get audit logs
        const audits = await db.query.auditLog.findMany({
            where: eq(auditLog.entityId, ncrId),
            orderBy: [desc(auditLog.createdAt)],
            with: { user: true },
        });

        // Generate HTML report
        const html = generateHTMLReport(ncrData, comments, magicLinks, audits);

        // Return as downloadable HTML (can be converted to PDF on client)
        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html",
                "Content-Disposition": `attachment; filename="${ncrData.ncrNumber}-audit-log.html"`,
            },
        });
    } catch (error) {
        console.error("[NCR_EXPORT]", error);
        return NextResponse.json(
            { error: "Export failed" },
            { status: 500 }
        );
    }
}

function generateHTMLReport(
    ncrData: any,
    comments: any[],
    magicLinks: any[],
    audits: any[]
): string {
    const formatDate = (date: Date | string) =>
        format(new Date(date), "MMM d, yyyy h:mm a");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NCR Audit Log - ${ncrData.ncrNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        h2 { font-size: 18px; margin: 30px 0 15px; border-bottom: 2px solid #333; padding-bottom: 5px; }
        .header { margin-bottom: 30px; }
        .meta { color: #666; font-size: 14px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .critical { background: #ef4444; color: white; }
        .major { background: #f97316; color: white; }
        .minor { background: #eab308; color: black; }
        .status { background: #e5e7eb; color: #374151; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        .timeline-item { padding: 12px 0; border-bottom: 1px solid #eee; }
        .timeline-item:last-child { border-bottom: none; }
        .timeline-time { color: #666; font-size: 12px; }
        .timeline-user { font-weight: 600; }
        .timeline-action { }
        .internal-badge { background: #fef3c7; color: #92400e; font-size: 11px; padding: 1px 6px; border-radius: 3px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        @media print {
            body { padding: 20px; }
            h2 { break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>NCR Audit Log</h1>
        <p><strong>${ncrData.ncrNumber}</strong> - ${ncrData.title}</p>
        <p class="meta">
            <span class="badge ${ncrData.severity.toLowerCase()}">${ncrData.severity}</span>
            <span class="badge status">${ncrData.status}</span>
        </p>
        <p class="meta" style="margin-top: 10px;">
            PO: ${ncrData.purchaseOrder?.poNumber || "N/A"} | 
            Supplier: ${ncrData.supplier?.name || "N/A"}
        </p>
        <p class="meta">Generated: ${formatDate(new Date())}</p>
    </div>

    <h2>NCR Details</h2>
    <table>
        <tr><th>Issue Type</th><td>${ncrData.issueType || "-"}</td></tr>
        <tr><th>Description</th><td>${ncrData.description || "-"}</td></tr>
        <tr><th>Reported By</th><td>${ncrData.reporter?.name || "-"}</td></tr>
        <tr><th>Created</th><td>${formatDate(ncrData.createdAt)}</td></tr>
        <tr><th>SLA Due</th><td>${ncrData.slaDueAt ? formatDate(ncrData.slaDueAt) : "-"}</td></tr>
        ${ncrData.closedAt ? `<tr><th>Closed</th><td>${formatDate(ncrData.closedAt)} by ${ncrData.closer?.name || "Unknown"}</td></tr>` : ""}
        ${ncrData.requiresCreditNote ? `<tr><th>Credit Note</th><td>Required (Payment Shield)</td></tr>` : ""}
    </table>

    <h2>Discussion Thread (${comments.length} comments)</h2>
    ${comments.length === 0 ? "<p>No comments</p>" : `
        <div class="timeline">
            ${comments.map(c => `
                <div class="timeline-item">
                    <span class="timeline-time">${formatDate(c.createdAt)}</span>
                    <span class="timeline-user">${c.user?.name || c.authorRole || "Unknown"}</span>
                    ${c.isInternal ? '<span class="internal-badge">Internal</span>' : ""}
                    <p class="timeline-action">${c.content || "[Attachment/Voice Note]"}</p>
                    ${c.attachmentUrls?.length ? `<p style="font-size: 12px; color: #666;">📎 ${c.attachmentUrls.length} attachment(s)</p>` : ""}
                    ${c.voiceNoteUrl ? `<p style="font-size: 12px; color: #666;">🎤 Voice note</p>` : ""}
                </div>
            `).join("")}
        </div>
    `}

    <h2>Supplier Access (Magic Links)</h2>
    ${magicLinks.length === 0 ? "<p>No magic links generated</p>" : `
        <table>
            <tr>
                <th>Created</th>
                <th>Expires</th>
                <th>Viewed</th>
                <th>Responded</th>
                <th>Actions</th>
            </tr>
            ${magicLinks.map(ml => `
                <tr>
                    <td>${formatDate(ml.createdAt)}</td>
                    <td>${formatDate(ml.expiresAt)}</td>
                    <td>${ml.viewedAt ? formatDate(ml.viewedAt) : "-"}</td>
                    <td>${ml.respondedAt ? formatDate(ml.respondedAt) : "-"}</td>
                    <td>${ml.actionCount || 0}</td>
                </tr>
            `).join("")}
        </table>
    `}

    <h2>Audit Trail (${audits.length} events)</h2>
    ${audits.length === 0 ? "<p>No audit logs</p>" : `
        <table>
            <tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr>
            ${audits.map(a => `
                <tr>
                    <td>${formatDate(a.createdAt)}</td>
                    <td>${a.user?.name || "-"}</td>
                    <td>${a.action}</td>
                    <td style="font-size: 11px;">${a.details || "-"}</td>
                </tr>
            `).join("")}
        </table>
    `}

    <div class="footer">
        <p>This document was automatically generated by Infradyn NCR System.</p>
        <p>Report ID: ${ncrData.id}</p>
    </div>
</body>
</html>
    `.trim();
}
