import React from 'react';
import { PhaseSection } from './PhaseSection';

export function Phase1() {
    return (
        <PhaseSection
            number={1}
            title="Foundation & Base Access"
            description="Establishing the core infrastructure, identity management, and multi-tenant architecture that powers the Infradyn platform."
            items={[
                "Modern Stack: Next.js 16 (App Router) with Tailwind CSS 4 for a future-proof foundation.",
                "Secure Identity: Integration of Better-Auth for robust session management, 2FA, and role-based access control.",
                "Multi-tenancy: Implementation of Organization and Member schemas to ensure complete data isolation between clients.",
                "Infrastructure Ops: High-performance PostgreSQL (Neon), managed with Drizzle ORM, paired with AWS S3 for secure document storage and Resend for transactional messaging."
            ]}
        />
    );
}
