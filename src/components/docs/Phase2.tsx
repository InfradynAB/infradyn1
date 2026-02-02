import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase2() {
    return (
        <PhaseSection
            number={2}
            title="PO Setup & Data Ingestion"
            description="The engine room of Infradyn, handling complex Bill of Quantities (BOQ) and the full lifecycle of Purchase Orders."
            journeySteps={[
                "Source Ingestion: PM uploads signed PO (PDF, Excel, Word, or ZIP) containing BOQ and schedules.",
                "AI Parsing: System extracts PO Number, Vendor, Milestones, and Payment Terms via LLM.",
                "BOQ Mapping: Intelligent mapping of line items (Quantity, UOM, Unit Price, Value).",
                "Milestone Structuring: Definition of lifecycle (Engineering → Fabrication → Delivery → Site Acceptance).",
                "Payment Logic: Input of payment terms and baseline amounts per extracted milestone.",
                "ROS Scheduling: Mandatory 'Required-on-Site' dates for critical materials (Validation-enforced).",
                "Compliance Validation: Automated check against Incoterms, retention %, and currency prior to publishing.",
                "Human-in-the-Loop: Review page for correction and confirmation of all extracted/mapped data."
            ]}
            systemActions={[
                "Textract/LLM Services: Structured extraction of unstructured file data.",
                "Consistency Engine: Validation of totals between PO headers and BOQ line items.",
                "Baseline Persistence: Linking ROS fields to project schedule baselines.",
                "Version Control: Generation of immutable history for the initial PO record.",
                "API Orchestration: Concurrent calls to Google Maps and Currency Converter services."
            ]}
            developerTriggers={[
                "File-Upload Parser",
                "Data-Mapping Logic",
                "Validation API",
                "Baseline Creation",
                "Version Control Service"
            ]}
        />
    );
}
