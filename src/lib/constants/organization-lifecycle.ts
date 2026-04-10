/**
 * Organization status values — shared semantics with admin app / Postgres `organization.status`.
 * Product access is allowed unless the org is explicitly suspended or terminated.
 */
export const ORG_STATUS = {
    ACTIVE: "ACTIVE",
    TRIAL: "TRIAL",
    ONBOARDING: "ONBOARDING",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
    TERMINATED: "TERMINATED",
} as const;

export type OrgStatusValue = (typeof ORG_STATUS)[keyof typeof ORG_STATUS];

const BLOCKED: ReadonlySet<string> = new Set([ORG_STATUS.SUSPENDED, ORG_STATUS.TERMINATED]);

export function isOrgProductAccessBlocked(status: string | null | undefined): boolean {
    if (!status) return false;
    return BLOCKED.has(status);
}

export function isOrgProductAccessAllowed(status: string | null | undefined): boolean {
    return !isOrgProductAccessBlocked(status);
}

export type OrgAccessBlockReason = "org_suspended" | "org_terminated";

export function blockReasonForOrgStatus(status: string): OrgAccessBlockReason | null {
    if (status === ORG_STATUS.TERMINATED) return "org_terminated";
    if (status === ORG_STATUS.SUSPENDED) return "org_suspended";
    return null;
}

/** Admin webhook / guest-ticket payload: org lifecycle highlight. */
export type AdminNotifyOrganizationStatus = "SUSPENDED" | "TERMINATED";

export function adminNotifyOrganizationStatusFromAccessBlockedReason(
    reason: string | undefined
): AdminNotifyOrganizationStatus | null {
    if (reason === "org_terminated") return "TERMINATED";
    if (reason === "org_suspended") return "SUSPENDED";
    return null;
}
