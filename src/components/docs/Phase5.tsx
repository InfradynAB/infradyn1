import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase5() {
    return (
        <PhaseSection
            number={5}
            title="Progress, Payment & Change Order Tracking"
            description="Leveraging machine learning to drastically reduce manual data entry and improve data integrity across the financial ledger."
            journeySteps={[
                "Milestone Propagation: Auto-updating completion % from verified site or supplier inputs.",
                "Financial Reconciliation: System cross-checks uploaded invoice values vs. approved progress percentages.",
                "Ledger Management: Real-time distribution tracking (Paid / Unpaid / Overdue / Retained).",
                "Change Order (CO) Workflow: Request submission (Scope/Rate/Quantity) linked to original PO and milestones.",
                "Budget Realignment: Auto-recalculation of committed cost and milestone variance upon CO approval.",
                "Traceability Threads: Contextual comments required for major actions (Invoice uploads, CO approvals).",
                "Live Serialization: Dashboard updates reflecting revised budget utilization and cashflow exposure."
            ]}
            systemActions={[
                "Ledger Engine: Financial reconciliation logic for multi-currency POs.",
                "Invoice Cross-Check: Validation against delivery receipts and approved milestone progress.",
                "Forecast Module: Auto-recalculating cost-to-complete based on latest approved COs.",
                "Escalation Logic: Role-based reminders for overdue approvals (PM → Finance → Executive).",
                "Dashboard Sync: Real-time API push for all financial state changes."
            ]}
            developerTriggers={[
                "Progress_Validator",
                "Invoice_Parser",
                "CO_Manager",
                "Payment_Ledger_Service",
                "Dashboard_Updater",
                "Escalation_Engine",
                "Audit_Logger"
            ]}
        />
    );
}
