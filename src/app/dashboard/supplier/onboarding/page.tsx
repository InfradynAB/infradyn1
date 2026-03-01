import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/db/drizzle";
import { supplier } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OnboardingForm } from "@/components/supplier/onboarding-form";
import { ProfileManagement } from "@/components/supplier/profile-management";

export default async function SupplierOnboardingPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "SUPPLIER") {
        redirect("/dashboard");
    }

    const supplierData = await db.query.supplier.findFirst({
        where: eq(supplier.userId, session.user.id),
        with: {
            documents: true
        }
    });

    if (!supplierData) {
        return <div>Error: Supplier profile not found.</div>;
    }

    // If supplier is fully onboarded (100% readiness), show profile management view
    const readinessScore = Number(supplierData.readinessScore) || 0;
    const isFullyOnboarded = readinessScore >= 100;


    if (isFullyOnboarded) {
        return (
            <ProfileManagement
                supplier={supplierData}
                userName={session.user.name || ""}
                userEmail={session.user.email || ""}
            />
        );
    }

    // Otherwise show onboarding wizard
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
            <div className="w-full max-w-2xl bg-card border rounded-2xl shadow-sm p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold">Complete Your Profile</h1>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        Please provide the required information and documents to start working with Infradyn purchase orders.
                    </p>
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">Readiness Score:</div>
                            <div className="text-sm font-bold text-primary">{supplierData.readinessScore}%</div>
                        </div>
                        <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-in-out"
                                style={{ width: `${supplierData.readinessScore || 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                <OnboardingForm supplier={supplierData} />
            </div>
        </div>
    );
}
