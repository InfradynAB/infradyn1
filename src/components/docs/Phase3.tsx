import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase3() {
    return (
        <PhaseSection
            number={3}
            title="Supplier Onboarding & PO Linking"
            description="Extending the platform to external partners with a dedicated supplier portal and compliance management system."
            journeySteps={[
                "PO Assignment: PM selects active POs and assigns them to supplier representatives.",
                "Onboarding Workflow: System generates secure tokens and invitation emails.",
                "Portal Registration: Supplier accepts, sets 2FA, and activates organization-specific account.",
                "Scoped Access: Suppliers gain immediate visibility of assigned POs, milestones, and costs.",
                "Capability Mapping: Supplier inputs industry data and services for centralized database usage.",
                "Qualification Upload: Submission of Tax IDs, ISO certificates, and Insurance docs.",
                "Lifecycle Activation: Supplier moves from 'Invited' to 'Active' status upon doc submission."
            ]}
            systemActions={[
                "Token Management: Generation and storage of expiring invitation tokens.",
                "Status Tracking: Real-time logging of invitation states (Pending/Accepted/Expired).",
                "Relational Linking: Establishing complex many-to-many relationships in the database.",
                "Metadata Validation: Expiry date validation for uploaded compliance documents.",
                "Readiness Scoring: Calculation of 'Supplier Readiness %' based on submitted qualification data."
            ]}
            developerTriggers={[
                "Supplier Invite API",
                "Token Validation",
                "User Registration Handler",
                "Document Storage Service",
                "Status Update Event",
                "RBAC Permission Map"
            ]}
        />
    );
}
