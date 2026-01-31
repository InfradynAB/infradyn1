import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldWarning, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function AccessDeniedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <Card className="w-full max-w-md border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="text-center pt-10">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <ShieldWarning className="h-12 w-12" weight="duotone" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-black">Access Required</CardTitle>
                    <CardDescription className="text-base pt-2">
                        You need to be invited to an organization before you can access Infradyn.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                        <EnvelopeSimple className="h-5 w-5 mx-auto mb-2" />
                        <p>
                            Please contact your organization administrator to send you an invitation link.
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Once invited, you&apos;ll receive an email with a link to join the organization.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-6">
                    <SignOutButton variant="outline" fullWidth className="h-12 rounded-xl" />
                    <Link href="/" className="w-full">
                        <Button variant="ghost" className="w-full text-muted-foreground">
                            Return to Home
                        </Button>
                    </Link>
                </CardFooter>
                {/* New section for users who tried to sign in without invitation */}
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-5 text-center border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-center mb-2">
                        <EnvelopeSimple className="h-6 w-6 text-blue-500 dark:text-blue-300" />
                    </div>
                    <div className="text-base font-semibold text-blue-700 dark:text-blue-200 mb-1">
                        We&apos;ve received your request
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-200">
                        Our support team has been notified and will contact you soon. If you have questions, please reach out to <a href="mailto:support@infradyn.com" className="underline">support@infradyn.com</a>.
                    </div>
                </div>
            </Card>
        </div>
    );
}
