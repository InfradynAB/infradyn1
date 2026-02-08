import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { PODashboardClient } from "@/components/dashboard/po/po-dashboard-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function POAnalyticsPage({ params }: PageProps) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    const { id } = await params;
    const result = await getPurchaseOrder(id);

    if (!result.success || !result.data) {
        notFound();
    }

    const po = result.data;

    return (
        <div className="flex flex-col min-h-screen">
            {/* Back navigation */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="flex items-center gap-3 px-6 py-3">
                    <Link href={`/dashboard/procurement/${id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Back to PO
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 p-6">
                <PODashboardClient
                    poId={id}
                    poNumber={po.poNumber}
                    poStatus={po.status}
                    supplierName={(po as any).supplier?.name}
                    projectName={(po as any).project?.name}
                />
            </div>
        </div>
    );
}
