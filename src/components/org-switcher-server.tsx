import { getUserOrganizationsWithActive } from "@/lib/utils/org-context";
import { OrgSwitcher } from "./org-switcher";

export async function OrgSwitcherServer() {
    const { organizations, activeOrgId } = await getUserOrganizationsWithActive();
    
    return (
        <OrgSwitcher 
            organizations={organizations} 
            activeOrgId={activeOrgId} 
        />
    );
}
