import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase7() {
    return (
        <PhaseSection
            number={7}
            title="Quality, NCR & Comment Management"
            description="Closing the technical quality loop by linking site defects directly to financial settlements through AI-powered NCR workflows."
            journeySteps={[
                "Inspection Trigger: QA/QC performs inspections at supplier yards or site and logs findings.",
                "NCR Generation: Manual creation or AI parsing of external NCR documents (PDF/Image).",
                "Automated Linking: System associates NCRs with specific POs, material batches, and suppliers.",
                "Supplier Notification: Dispatched via email/OneSignal with secure portal response links.",
                "Contextual Threading: Threaded comments and voice notes for site teams and suppliers.",
                "Payment Blocking: 'Payment Shield' logic automatically locks milestones for materials with open NCRs.",
                "Resolution Workflow: Verification of corrective actions followed by formal NCR closure.",
                "Audit Trail: Contextual history logs preserved for every quality-related action."
            ]}
            systemActions={[
                "OCR/NLP Engine: Extraction of metadata (Defect type, corrective action, severity).",
                "Locking Controller: Business logic preventing 'Accepted' status for flagged materials.",
                "SLA Tracker: Automated timers and escalations based on NCR severity (Critical/Major/Minor).",
                "Communication Hub: Multi-role threaded discussion service with file attachment support.",
                "Report Generator: Automated drafting of exportable QA history logs."
            ]}
            developerTriggers={[
                "NCR_Creation_API",
                "Document_Ingestion_Handler",
                "Notification_Service",
                "Comment_Thread_Builder",
                "Status_Lifecycle_Handler",
                "Milestone_Lock_Logic",
                "SLA_Engine"
            ]}
        />
    );
}
