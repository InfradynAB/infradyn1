import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase1() {
    return (
        <PhaseSection
            number={1}
            title="Organization Setup & Project Creation"
            description="Establishing the core infrastructure, identity management, and multi-tenant architecture that powers the Infradyn platform."
            journeySteps={[
                "Admin Portal Login: Infradyn admin creates Organization Account (Name, Contact, Email).",
                "PM Invitation: Admin invites Project Manager (Portal exists, handles invitation emails).",
                "Account Activation: PM accepts invite, creates credentials, and activates account/org details.",
                "Team Building: PM adds members (Inspection Engineers, Receivers, Suppliers) via RBAC.",
                "Workspace Initialization: Creation of Project Workspace (e.g., 'SSAB Furnace Rebuild 2025').",
                "Parameter Definition: Setting location (Google Maps for weather), Budget, Currency (Converter API), and Material Categories.",
                "Supplier Registry: Bulk Excel import of supplier contacts for initial organization-level listing."
            ]}
            systemActions={[
                "Identity & Encryption: Secure storage of profiles using GDPR-compliant encryption.",
                "Workspace Schema: Initialization of folder structures and unique Project IDs.",
                "RBAC Activation: Generation and enforcement of role-based permission schemas.",
                "Supplier Lifecycle: Initializing registry states (Inactive, Invited, Active, Suspended).",
                "Audit Initialization: Activation of audit logging for all setup events.",
                "Compliance Config: Establishment of encryption and data retention policies at the org level."
            ]}
            developerTriggers={[
                "User/Org Creation API",
                "RBAC Middleware",
                "Supplier Import Parser",
                "Audit Logger",
                "Encryption Initializer"
            ]}
        />
    );
}
