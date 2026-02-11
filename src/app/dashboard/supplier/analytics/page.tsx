"use client";

import {
    FileText, Truck, Receipt, ShieldWarning, CheckCircle,
    ShieldCheck, Target, CurrencyDollar, Clock, CalendarCheck,
    Gauge,
} from "@phosphor-icons/react";
import {
    KPICard, SectionHeader, mockKPIs, fmt, pct,
} from "@/components/dashboard/supplier/analytics-shared";

export default function AnalyticsOverviewPage() {
    const kpis = mockKPIs();

    return (
        <div className="space-y-5">
            <SectionHeader
                icon={Gauge}
                iconBg="bg-slate-100 dark:bg-slate-500/20"
                iconColor="text-slate-600 dark:text-slate-400"
                title="Overview"
                subtitle="Key performance indicators at a glance"
            />

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                <KPICard label="Active POs" value={kpis.totalActivePOs.toString()} icon={FileText} color="blue" subtitle={fmt(kpis.totalPOValue, kpis.currency === "USD" ? "$" : kpis.currency + " ")} />
                <KPICard label="Pending Deliveries" value={kpis.pendingDeliveries.toString()} icon={Truck} color="amber" subtitle={`${kpis.upcomingDeliveriesThisWeek} this week`} />
                <KPICard label="Invoices Pending" value={kpis.invoicesPendingApproval.toString()} icon={Receipt} color="violet" subtitle={`Avg ${kpis.averagePaymentCycle}d cycle`} />
                <KPICard label="Open NCRs" value={kpis.ncrsAssigned.toString()} icon={ShieldWarning} color="red" alert={kpis.ncrsAssigned > 0} subtitle="Requires response" />
                <KPICard label="On-Time Delivery" value={pct(kpis.onTimeDeliveryScore, 0)} icon={CheckCircle} color="emerald" subtitle="Delivery score" />
            </div>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                <KPICard label="Compliance Score" value={pct(kpis.documentComplianceScore, 0)} icon={ShieldCheck} color="emerald" subtitle="Document health" />
                <KPICard label="Milestones Pending" value={kpis.milestonesPendingApproval.toString()} icon={Target} color="amber" subtitle="Awaiting client approval" />
                <KPICard label="Payments Received" value={fmt(kpis.totalPaymentsReceived)} icon={CurrencyDollar} color="emerald" subtitle="Total to date" />
                <KPICard label="Avg Payment Cycle" value={`${kpis.averagePaymentCycle}d`} icon={Clock} color="blue" subtitle="Invoice to payment" />
                <KPICard label="This Week" value={kpis.upcomingDeliveriesThisWeek.toString()} icon={CalendarCheck} color="blue" subtitle="Upcoming deliveries" />
            </div>
        </div>
    );
}
