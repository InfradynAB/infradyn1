import { notFound } from "next/navigation";
import db from "@/db/drizzle";
import { supplier, supplierDocument } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    BuildingsIcon,
    FileTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    LinkBreakIcon,
    ArrowLeftIcon,
    SealCheckIcon,
    ShieldCheckIcon,
    EnvelopeSimpleIcon,
    IdentificationCardIcon
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { verifySupplierDocument, approveSupplierReadiness } from "@/lib/actions/compliance";
import { revalidatePath } from "next/cache";

interface SupplierDetailPageProps {
    params: { id: string };
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const supplierRecord = await db.query.supplier.findFirst({
        where: eq(supplier.id, id),
        with: {
            documents: true
        }
    });

    if (!supplierRecord) {
        notFound();
    }

    const isVerified = supplierRecord.status === 'ACTIVE';
    const readiness = Number(supplierRecord.readinessScore) || 0;

    return (
        <div className="flex flex-col gap-8 pb-10 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/dashboard/suppliers">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-black tracking-tight">{supplierRecord.name}</h1>
                        {isVerified && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-200/50 flex items-center gap-1 px-2 py-0 text-[10px] font-black uppercase tracking-widest ring-1 ring-green-500/20">
                                <SealCheckIcon className="h-3 w-3" weight="fill" />
                                Verified Partner
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground font-medium">Supplier Profile & Verification Center</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Overview */}
                <div className="md:col-span-2 space-y-8">
                    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
                        <div className="h-1.5 bg-blue-500" />
                        <CardHeader className="px-8 pt-8">
                            <div className="flex items-center gap-2 mb-2">
                                <IdentificationCardIcon className="h-5 w-5 text-blue-500" weight="duotone" />
                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Business Overview</span>
                            </div>
                            <CardTitle className="text-2xl font-bold">Industry & Services</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-6">
                            <div className="grid gap-2">
                                <span className="text-sm font-black text-muted-foreground uppercase tracking-tighter">Sector focus</span>
                                <p className="text-lg font-bold bg-muted/30 p-4 rounded-xl border border-muted/50">
                                    {supplierRecord.industry || "Not specified by supplier"}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <span className="text-sm font-black text-muted-foreground uppercase tracking-tighter">Core Products & Capabilities</span>
                                <div className="text-base font-medium leading-relaxed bg-muted/30 p-6 rounded-xl border border-muted/50 whitespace-pre-wrap text-foreground/80">
                                    {supplierRecord.services || "No detailed service description provided."}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
                        <div className="h-1.5 bg-amber-500" />
                        <CardHeader className="px-8 pt-8">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheckIcon className="h-5 w-5 text-amber-500" weight="duotone" />
                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Credential Verification</span>
                            </div>
                            <CardTitle className="text-2xl font-bold">Uploaded Documents</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                            {supplierRecord.documents.length === 0 ? (
                                <div className="py-12 text-center bg-muted/20 rounded-2xl border border-dashed border-muted">
                                    <FileTextIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-bold italic">No documents uploaded yet</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {supplierRecord.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-5 bg-muted/30 rounded-2xl border border-muted/50 group hover:border-primary/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-white/50 backdrop-blur-sm flex items-center justify-center text-primary shadow-sm">
                                                    <FileTextIcon className="h-7 w-7" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg capitalize">{doc.documentType.replace('_', ' ')}</div>
                                                    <a
                                                        href={doc.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-black text-blue-600 hover:underline uppercase tracking-widest"
                                                    >
                                                        View Document Source
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.status === 'APPROVED' ? (
                                                    <Badge className="bg-green-500/10 text-green-600 border-none px-3 py-1 font-black uppercase tracking-widest text-[10px]">Approved</Badge>
                                                ) : doc.status === 'REJECTED' ? (
                                                    <Badge className="bg-red-500/10 text-red-600 border-none px-3 py-1 font-black uppercase tracking-widest text-[10px]">Rejected</Badge>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <form action={async () => {
                                                            "use server";
                                                            await verifySupplierDocument(doc.id, 'APPROVED');
                                                        }}>
                                                            <Button size="sm" variant="outline" className="h-9 px-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20 font-bold">
                                                                Approve
                                                            </Button>
                                                        </form>
                                                        <form action={async () => {
                                                            "use server";
                                                            await verifySupplierDocument(doc.id, 'REJECTED');
                                                        }}>
                                                            <Button size="sm" variant="outline" className="h-9 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20 font-bold">
                                                                Reject
                                                            </Button>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Status Sidebar */}
                <div className="space-y-8">
                    <Card className="border-none shadow-2xl bg-card overflow-hidden">
                        <div className="p-8 text-center space-y-6">
                            <div className="relative inline-block">
                                <div className={`h-24 w-24 rounded-full flex items-center justify-center border-4 transition-all duration-1000 ${isVerified ? 'border-green-500 bg-green-500/10' : 'border-primary bg-primary/5'}`}>
                                    <span className="text-2xl font-black">{readiness}%</span>
                                </div>
                                {isVerified && (
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                                        <CheckCircleIcon className="h-5 w-5" weight="fill" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-xl font-black mb-1">Readiness Score</h3>
                                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest leading-relaxed">
                                    {isVerified ? "This supplier is fully verified and active." : "Pending final PM verification and activation."}
                                </p>
                            </div>

                            {!isVerified && (
                                <form action={async () => {
                                    "use server";
                                    await approveSupplierReadiness(id);
                                }}>
                                    <Button
                                        className="w-full h-14 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black text-lg shadow-xl"
                                        disabled={readiness < 100}
                                    >
                                        Verify & Activate
                                    </Button>
                                </form>
                            )}
                        </div>

                        <div className="bg-muted/30 p-6 border-t border-muted/50 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/80 shadow-sm text-muted-foreground">
                                    <EnvelopeSimpleIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contact Email</div>
                                    <div className="font-bold">{supplierRecord.contactEmail || "None provided"}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/80 shadow-sm text-muted-foreground">
                                    <BuildingsIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tax ID</div>
                                    <div className="font-bold">{supplierRecord.taxId || "Not registered"}</div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-none shadow-xl bg-blue-600 text-white p-6 space-y-4">
                        <SealCheckIcon className="h-10 w-10 text-blue-200" weight="duotone" />
                        <h4 className="text-lg font-black leading-tight">Verification Guidelines</h4>
                        <ol className="text-sm font-medium space-y-3 list-decimal list-inside text-blue-50/80">
                            <li>Review industry and service scope compatibility.</li>
                            <li>Open and verify all compliance PDFs.</li>
                            <li>Ensure document validity and expiry dates.</li>
                            <li>Click 'Verify & Activate' to grant portal access.</li>
                        </ol>
                    </Card>
                </div>
            </div>
        </div>
    );
}
