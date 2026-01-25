import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase3() {
    return (
        <PhaseSection
            number={3}
            title="Supplier Ecosystem"
            description="Extending the platform to external partners with a dedicated supplier portal and compliance management system."
            items={[
                "Streamlined Onboarding: Invitation-driven registration flow ensuring only authorized suppliers gain access.",
                "Private Portal: Secure dashboards for suppliers to view their specific POs and update progress.",
                "Compliance Engine: Centralized storage and tracking for certifications, tax IDs, and other critical documentation.",
                "Active Collaboration: Direct communication channels and automated email notifications to keep suppliers aligned with project timelines."
            ]}
        />
    );
}
