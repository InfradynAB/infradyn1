import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase2() {
    return (
        <PhaseSection
            number={2}
            title="Procurement & BOQ Engine"
            description="The engine room of Infradyn, handling complex Bill of Quantities (BOQ) and the full lifecycle of Purchase Orders."
            items={[
                "Granular Data Model: Specialized tables for purchase orders and BOQ line items with full versioning.",
                "Lifecycle Management: Automated state transitions from Draft to Approved, and finally Issued.",
                "BOQ Intelligence: Real-time tracking of unit prices, quantities, and cumulative total value calculations.",
                "Accountability: Logic-driven approval workflows and immutable audit logs to ensure total traceability of financial commitments."
            ]}
        />
    );
}
