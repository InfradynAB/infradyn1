import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Suspense } from "react";

export default function VerifyEmailPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center px-4">
            <Suspense>
                <VerifyEmailForm />
            </Suspense>
        </div>
    );
}
