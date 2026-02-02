import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase4() {
    return (
        <PhaseSection
            number={4}
            title="Dual-Path Ingestion & Intelligent Tracking"
            description="Developing the logic to tie physical progress to financial settlement, ensuring multi-stage accountability through hybrid data sources."
            journeySteps={[
                "Path A (Supplier-Driven): Automated parsing of emails, portal uploads (PDF/Excel), and synced trackers via layout-aware OCR.",
                "Path B (Internal-Driven): Quick-entry forms with AI suggestions for logging site visits or call-based updates.",
                "Gap Forecasting: Automated 'Forecast' badge triggers if no update is received within 7 days or 3 days of a milestone.",
                "Risk-Based Chasing: Dynamically adjusted reminder cadence (Weekly → Daily) based on milestone proximity and risk level.",
                "Trust Scoring: Color-coded indicators (Green: Verified, Amber: Internal, Gray: Forecast) showing data provenance.",
                "Unified Conflict Queue: High-variance discrepancies (Supplier vs Internal) routed for PM adjudication.",
                "Gallery Orchestration: Automatic creation of a visual evidence gallery for every individual PO.",
                "Performance Tracking: Consolidation of supplier history across multiple projects for long-term evaluation."
            ]}
            systemActions={[
                "Ingestion Router: Merging multi-channel data with source-confidence tagging.",
                "Chase Engine: Dynamic logic for reminder frequency adjustments.",
                "Validator Scorer: Confidence-based approval workflows for financial milestones.",
                "Conflict Detector: Anomaly detection across asynchronous data sources.",
                "Progress Calculator: Aggregating weighted values from verified and predicted data points.",
                "Gallery Service: S3-backed visual management system for site evidence."
            ]}
            developerTriggers={[
                "Email_Listener",
                "Document_Parser",
                "Confidence_Scorer",
                "Risk_Based_Chase_Engine",
                "Unified_Conflict_Detector",
                "Critical_Path_Integrator",
                "Progress_Calculator",
                "Manual_Tagging_Service"
            ]}
        />
    );
}
