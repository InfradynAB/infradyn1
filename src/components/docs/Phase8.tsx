import React from 'react';
import { PhaseSection } from './PhaseSection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '../ui/badge';

export function Phase8() {
    return (
        <PhaseSection
            number={8}
            title="Dashboards, Reporting & Data Exports"
            description="The intelligence layer of Infradyn, providing a unified view of project health, financial exposure, and predictive risk management."
            journeySteps={[
                "Contextual Access: Automated routing to Executive (KPIs), Action (Alerts), or Deep Dive views.",
                "Insight Surfacing: Proactive highlighting of delayed POs and NCR spikes without manual filtering.",
                "Risk Assessment: AI-detected highlights of supplier performance and budget overruns.",
                "Drill-Down: Immediate navigation from high-level KPIs to underlying PO or NCR records.",
                "Reporting Lifecycle: Weekly Health Summaries and Supplier Scorecards with AI-written narratives.",
                "Forecasting: Predictive completion dates and cashflow mapping for next 30/60/90 days.",
                "Global Visibility: Cross-project supplier performance comparison and audit-ready data exports."
            ]}
            systemActions={[
                "Data Aggregator: 15-minute polling and consolidation of PO, progress, and financial data.",
                "Insight Engine: Trend analysis, anomaly detection, and automated recommendations.",
                "Risk Algorithm: Computation of delay probability and cost overrun scores per PO.",
                "Predictive Module: Forensic schedule forecasting and payment exposure modeling.",
                "Visualization Layer: Dynamic rendering of layered dashboards based on RBAC roles.",
                "Auto-Distribution: Scheduled email delivery of health summaries and briefing packs."
            ]}
            developerTriggers={[
                "Data_Aggregation_Service",
                "Ai_Insight_Engine",
                "Risk_Scoring_Algorithm",
                "Predictive_Analytics_Module",
                "Visualization_Engine",
                "Automated_Reporting_Service",
                "Notification_Service",
                "Audit_Logger"
            ]}
        >
            <div className="mt-12 space-y-12">
                <div>
                    <h4 className="text-xl font-bold mb-4">Key Performance Indicators (KPIs)</h4>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">KPI</TableHead>
                                <TableHead className="font-bold">Calculation Logic</TableHead>
                                <TableHead className="font-bold">Purpose</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-bold">% Physical Progress</TableCell>
                                <TableCell className="text-xs font-mono">(Σ Actual Milestone % × Value) / Total PO Value</TableCell>
                                <TableCell className="text-sm">Measures vendor progress against the baseline plan.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">% Financial Progress</TableCell>
                                <TableCell className="text-xs font-mono">(Σ Paid Amount) / (Σ Total Committed Value)</TableCell>
                                <TableCell className="text-sm">Shows real cashflow progress and completion liquidity.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">Committed Value</TableCell>
                                <TableCell className="text-xs font-mono">Σ (PO Value + Approved CO Value)</TableCell>
                                <TableCell className="text-sm">Reflects total current financial exposure/liability.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">Forecast to Complete</TableCell>
                                <TableCell className="text-xs font-mono">(Committed Value - Paid) + Pending COs</TableCell>
                                <TableCell className="text-sm">Predicts total cash required for final project close.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">Avg Payment Cycle</TableCell>
                                <TableCell className="text-xs font-mono">avg(payment_date - invoice_date)</TableCell>
                                <TableCell className="text-sm">Measures efficiency of internal payment turnaround.</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div>
                    <h4 className="text-xl font-bold mb-4">Core Data Model References</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { name: "PO Tracker", desc: "Source of truth for progress, cost, and forecast tracking." },
                            { name: "Milestone", desc: "Dynamic item tracking verified against site/supplier inputs." },
                            { name: "Invoice Ledger", desc: "Reconciliation hub for billing and payment metrics." },
                            { name: "Change Order", desc: "Formal record for budget and schedule deviations." },
                            { name: "NCR Bridge", desc: "Links quality deviations to financial progress locks." },
                            { name: "Logistics Hub", desc: "Feeds schedule deviation and shipping metadata." }
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl border bg-card shadow-sm hover:border-primary/20 transition-colors">
                                <span className="font-black text-primary block mb-2 text-xs uppercase tracking-tighter">{item.name}</span>
                                <span className="text-sm text-muted-foreground leading-tight">{item.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-xl font-bold mb-4">Dashboard Widgets</h4>
                    <div className="flex flex-wrap gap-2">
                        {[
                            "Supplier Progress Bars",
                            "Executive Summary Tiles",
                            "Milestone Variance Table",
                            "CO Stacked Bar Chart",
                            "Cumulative Cashflow Trend",
                            "Top Exposure Heatmap",
                            "Billing Accuracy Gauge"
                        ].map((widget, i) => (
                            <Badge key={i} variant="outline" className="px-3 py-1 font-medium bg-muted/30">
                                {widget}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
        </PhaseSection>
    );
}
