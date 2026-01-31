/**
 * Phase 8: Weekly Report Cron Job
 * Auto-generates and emails weekly project health summaries every Monday
 */

import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { organization, project, member, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getDashboardKPIs, getSCurveData, getCOBreakdown } from "@/lib/services/kpi-engine";
import { getRiskAssessments, getCashflowForecast, getSupplierProgressData } from "@/lib/services/report-engine";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return false;
    return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all active organizations
        const orgs = await db.query.organization.findMany({
            where: eq(organization.isDeleted, false),
        });

        const results: { orgId: string; orgName: string; emailsSent: number; error?: string }[] = [];

        for (const org of orgs) {
            try {
                // Get all active projects for this org
                const projects = await db.query.project.findMany({
                    where: and(
                        eq(project.organizationId, org.id),
                        eq(project.isDeleted, false)
                    ),
                });

                // Get org admins and project managers to send report to
                const members = await db.query.member.findMany({
                    where: and(
                        eq(member.organizationId, org.id),
                        eq(member.isDeleted, false)
                    ),
                    with: {
                        user: true,
                    },
                });

                const recipientEmails = members
                    .filter((m: { role: string }) => ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(m.role))
                    .map((m: { user?: { email?: string | null } }) => m.user?.email)
                    .filter((email: string | null | undefined): email is string => !!email);

                if (recipientEmails.length === 0) {
                    results.push({ orgId: org.id, orgName: org.name, emailsSent: 0, error: "No recipients" });
                    continue;
                }

                // Generate report data
                const filters = { organizationId: org.id };
                const [kpis, sCurve, coBreakdown, risks, cashflow, supplierProgress] = await Promise.all([
                    getDashboardKPIs(filters),
                    getSCurveData(filters),
                    getCOBreakdown(filters),
                    getRiskAssessments(filters),
                    getCashflowForecast(filters),
                    getSupplierProgressData(filters),
                ]);

                // Generate AI narrative
                const narrative = generateWeeklyNarrative({ kpis, risks, cashflow, supplierProgress });

                // Generate HTML email
                const emailHtml = generateWeeklyReportEmail({
                    orgName: org.name,
                    kpis,
                    narrative,
                    risks: risks.slice(0, 5), // Top 5 risky POs
                    cashflow,
                    supplierProgress: supplierProgress.slice(0, 5), // Top 5 suppliers
                });

                // Send email
                await resend.emails.send({
                    from: "Infradyn Reports <reports@infradyn.com>",
                    to: recipientEmails,
                    subject: `Weekly Project Health Report - ${org.name} - ${new Date().toLocaleDateString()}`,
                    html: emailHtml,
                });

                results.push({ orgId: org.id, orgName: org.name, emailsSent: recipientEmails.length });
            } catch (error) {
                console.error(`Error processing org ${org.id}:`, error);
                results.push({ 
                    orgId: org.id, 
                    orgName: org.name, 
                    emailsSent: 0, 
                    error: error instanceof Error ? error.message : "Unknown error" 
                });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Weekly report cron error:", error);
        return NextResponse.json(
            { error: "Failed to generate weekly reports" },
            { status: 500 }
        );
    }
}

function generateWeeklyNarrative(data: {
    kpis: Awaited<ReturnType<typeof getDashboardKPIs>>;
    risks: Awaited<ReturnType<typeof getRiskAssessments>>;
    cashflow: Awaited<ReturnType<typeof getCashflowForecast>>;
    supplierProgress: Awaited<ReturnType<typeof getSupplierProgressData>>;
}): string[] {
    const { kpis, risks, cashflow, supplierProgress } = data;
    const narratives: string[] = [];

    // Financial overview
    const financialProgress = kpis.progress.financialProgress;
    const physicalProgress = kpis.progress.physicalProgress;
    const progressVariance = financialProgress - physicalProgress;
    
    if (progressVariance > 10) {
        narratives.push(
            `⚠️ Financial Progress (${financialProgress.toFixed(1)}%) is ahead of Physical Progress (${physicalProgress.toFixed(1)}%) by ${progressVariance.toFixed(1)} percentage points. ` +
            `This indicates potential overpayment risk. Review milestone completions before approving further payments.`
        );
    } else if (progressVariance < -10) {
        narratives.push(
            `✅ Physical Progress (${physicalProgress.toFixed(1)}%) is ahead of Financial Progress (${financialProgress.toFixed(1)}%) by ${Math.abs(progressVariance).toFixed(1)} percentage points. ` +
            `Suppliers are delivering ahead of payment schedule, indicating healthy cash flow management.`
        );
    } else {
        narratives.push(
            `📊 Project progress is on track with Physical Progress at ${physicalProgress.toFixed(1)}% and Financial Progress at ${financialProgress.toFixed(1)}%. ` +
            `The alignment indicates well-managed supplier relationships and payment cycles.`
        );
    }

    // Risk summary
    const highRiskPOs = risks.filter(r => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL");
    if (highRiskPOs.length > 0) {
        const topRisk = highRiskPOs[0];
        narratives.push(
            `🔴 ${highRiskPOs.length} PO(s) flagged as high-risk this week. ` +
            `Top concern: ${topRisk.poNumber} (${topRisk.supplierName}) with a risk score of ${topRisk.riskScore}/100. ` +
            `Primary factors: ${topRisk.riskFactors.map(f => f.factor).join(", ")}. ` +
            `Recommended action: Immediate review and supplier escalation.`
        );
    } else {
        narratives.push(
            `✅ No high-risk POs identified this week. All active purchase orders are within acceptable risk thresholds. ` +
            `Continue regular monitoring through the dashboard.`
        );
    }

    // Cashflow forecast
    const next30Days = cashflow.find(c => c.period === "Next 30 Days");
    if (next30Days && (next30Days.expectedPayments + next30Days.pendingInvoices) > 0) {
        const totalExposure = next30Days.expectedPayments + next30Days.pendingInvoices;
        narratives.push(
            `💰 Cashflow forecast for the next 30 days: ${formatCurrencyNarrative(totalExposure)} in expected payments. ` +
            `${formatCurrencyNarrative(next30Days.expectedPayments)} already approved, ${formatCurrencyNarrative(next30Days.pendingInvoices)} pending verification. ` +
            `Ensure adequate cash reserves for upcoming disbursements.`
        );
    }

    // Quality summary
    if (kpis.quality.criticalNCRs > 0) {
        narratives.push(
            `⚠️ Quality Alert: ${kpis.quality.criticalNCRs} critical NCR(s) remain open. ` +
            `Total NCR financial impact: ${formatCurrencyNarrative(kpis.quality.ncrFinancialImpact)}. ` +
            `Prioritize resolution to avoid delivery delays and cost escalation.`
        );
    }

    // Supplier performance
    const underperformingSuppliers = supplierProgress.filter(s => s.riskScore > 40);
    if (underperformingSuppliers.length > 0) {
        narratives.push(
            `📋 ${underperformingSuppliers.length} supplier(s) showing performance concerns. ` +
            `Review supplier scorecards and consider performance improvement meetings.`
        );
    }

    return narratives;
}

function formatCurrencyNarrative(value: number): string {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(2)}`;
}

function generateWeeklyReportEmail(data: {
    orgName: string;
    kpis: Awaited<ReturnType<typeof getDashboardKPIs>>;
    narrative: string[];
    risks: Awaited<ReturnType<typeof getRiskAssessments>>;
    cashflow: Awaited<ReturnType<typeof getCashflowForecast>>;
    supplierProgress: Awaited<ReturnType<typeof getSupplierProgressData>>;
}): string {
    const { orgName, kpis, narrative, risks, cashflow, supplierProgress } = data;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Project Health Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 32px 24px; }
        .header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 24px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .kpi-card { background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; }
        .kpi-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .kpi-value { font-size: 20px; font-weight: 600; color: #1e293b; }
        .kpi-value.green { color: #059669; }
        .kpi-value.red { color: #dc2626; }
        .kpi-value.amber { color: #d97706; }
        .narrative { background: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0; }
        .narrative p { margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
        .badge.ai { background: #f3e8ff; color: #7c3aed; }
        .badge.critical { background: #fee2e2; color: #dc2626; }
        .badge.high { background: #ffedd5; color: #ea580c; }
        .badge.medium { background: #fef9c3; color: #ca8a04; }
        .badge.low { background: #dcfce7; color: #16a34a; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 8px; background: #f1f5f9; color: #475569; font-weight: 500; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weekly Project Health Report</h1>
            <p>${orgName} • Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div class="content">
            <!-- KPIs -->
            <div class="section">
                <div class="section-title">📊 Key Metrics</div>
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Committed</div>
                        <div class="kpi-value">${formatCurrencyNarrative(kpis.financial.totalCommitted)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total Paid</div>
                        <div class="kpi-value green">${formatCurrencyNarrative(kpis.financial.totalPaid)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Outstanding</div>
                        <div class="kpi-value ${kpis.financial.totalUnpaid > 0 ? 'amber' : ''}">${formatCurrencyNarrative(kpis.financial.totalUnpaid)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Physical Progress</div>
                        <div class="kpi-value">${kpis.progress.physicalProgress.toFixed(1)}%</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Financial Progress</div>
                        <div class="kpi-value">${kpis.progress.financialProgress.toFixed(1)}%</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Active POs</div>
                        <div class="kpi-value">${kpis.progress.activePOs}/${kpis.progress.totalPOs}</div>
                    </div>
                </div>
            </div>

            <!-- AI Narrative -->
            <div class="section">
                <div class="section-title">🤖 AI Analysis <span class="badge ai">AI Generated</span></div>
                ${narrative.map(n => `<div class="narrative"><p>${n}</p></div>`).join('')}
            </div>

            <!-- Risk Summary -->
            ${risks.length > 0 ? `
            <div class="section">
                <div class="section-title">⚠️ Risk Summary</div>
                <table>
                    <thead>
                        <tr>
                            <th>PO</th>
                            <th>Supplier</th>
                            <th>Risk Level</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${risks.map(r => `
                        <tr>
                            <td>${r.poNumber}</td>
                            <td>${r.supplierName}</td>
                            <td><span class="badge ${r.riskLevel.toLowerCase()}">${r.riskLevel}</span></td>
                            <td>${r.riskScore}/100</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- Cashflow Forecast -->
            <div class="section">
                <div class="section-title">💰 Cashflow Forecast</div>
                <table>
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Expected</th>
                            <th>Pending</th>
                            <th>Cumulative</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cashflow.map(c => `
                        <tr>
                            <td>${c.period}</td>
                            <td>${formatCurrencyNarrative(c.expectedPayments)}</td>
                            <td>${formatCurrencyNarrative(c.pendingInvoices)}</td>
                            <td>${formatCurrencyNarrative(c.cumulativeExposure)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Top Suppliers -->
            ${supplierProgress.length > 0 ? `
            <div class="section">
                <div class="section-title">🏭 Top Suppliers by Exposure</div>
                <table>
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th>Value</th>
                            <th>Physical</th>
                            <th>Financial</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${supplierProgress.map(s => `
                        <tr>
                            <td>${s.supplierName}</td>
                            <td>${formatCurrencyNarrative(s.totalValue)}</td>
                            <td>${s.physicalProgress.toFixed(1)}%</td>
                            <td>${s.financialProgress.toFixed(1)}%</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.infradyn.com'}/dashboard/analytics" class="button">
                    View Full Dashboard →
                </a>
            </div>
        </div>

        <div class="footer">
            <p>This is an automated weekly report from Infradyn Material Tracker.</p>
            <p>© ${new Date().getFullYear()} Infradyn. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
}
