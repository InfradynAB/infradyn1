import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SupplierDashboardClient } from "@/components/dashboard/supplier/supplier-dashboard-client";

export default async function SupplierAnalyticsPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        redirect("/sign-in");
    }

    if (session.user.role !== "SUPPLIER") {
        redirect("/dashboard");
    }

    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex-1 p-6">
                <SupplierDashboardClient />
            </div>
        </div>
    );
}
