import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AnalyticsShell } from "@/components/dashboard/supplier/analytics-shell";

export default async function SupplierAnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
                <AnalyticsShell>
                    {children}
                </AnalyticsShell>
            </div>
        </div>
    );
}
