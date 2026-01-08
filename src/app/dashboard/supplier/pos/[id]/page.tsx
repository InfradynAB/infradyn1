import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import db from "@/db/drizzle";
import { purchaseOrder, supplier, progressRecord, changeOrder } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupplierPOActions } from "@/components/supplier/po-actions";
import { FileTextIcon, CalendarIcon, PackageIcon, StackIcon, TruckIcon, CurrencyDollarIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { format } from "date-fns";
import { InvoiceUploadSheet } from "@/components/procurement/invoice-upload-sheet";
import { ChangeOrderForm } from "@/components/procurement/change-order-form";
import { PaymentStatusBadge, COStatusBadge } from "@/components/procurement/payment-status-badge";
import { Button } from "@/components/ui/button";

export default async function SupplierPODetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "SUPPLIER") {
        redirect("/dashboard");
    }

    const supplierData = await db.query.supplier.findFirst({
        where: eq(supplier.userId, session.user.id)
    });

    if (!supplierData) {
        return <div className="p-20 text-center font-bold">Error: Supplier profile not found.</div>;
    }

    const po = await db.query.purchaseOrder.findFirst({
        where: and(
            eq(purchaseOrder.id, id),
            eq(purchaseOrder.supplierId, supplierData.id)
        ),
        with: {
            project: true,
            boqItems: true,
            milestones: {
                with: {
                    payments: true,
                    progressRecords: {
                        orderBy: desc(progressRecord.reportedDate),
                        limit: 1
                    }
                }
            },
            changeOrders: {
                orderBy: desc(changeOrder.createdAt)
            },
            organization: true
        }
    });

    // Import progressRecord and changeOrder from schema for the query
    // Wait, the query is using db.query.purchaseOrder.findFirst, so I need to check if schema is imported correctly.
    // In this file, db is imported from "@/db/drizzle", but schema tables are imported from "@/db/schema".
    // I should check if progressRecord and changeOrder are in the schema imports.


    if (!po) {
        notFound();
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "ISSUED": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
            case "ACCEPTED": return "bg-green-500/10 text-green-600 border-green-500/20";
            case "REJECTED": return "bg-red-500/10 text-red-600 border-red-500/20";
            default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
        }
    };

    return (
        <div className="flex flex-col gap-10 pb-20 max-w-[1200px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 border-muted/50">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        <StackIcon className="h-4 w-4" />
                        Procurement / {po.poNumber}
                    </div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter mb-2">{po.organization.name}</h1>
                        <p className="text-xl text-muted-foreground font-medium">Project: <span className="text-foreground">{po.project.name}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge className={`text-sm font-black px-4 py-1.5 rounded-full border-2 ${getStatusVariant(po.status)}`}>
                        {po.status}
                    </Badge>
                    <SupplierPOActions poId={po.id} currentStatus={po.status} />
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Meta Details */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-white/10">
                        <div className="h-1.5 bg-blue-600" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <FileTextIcon className="h-5 w-5 text-blue-500" weight="duotone" />
                                Order Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Date of Issue</span>
                                <span className="font-bold text-lg flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                    {po.createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Total Commitment</span>
                                <span className="text-3xl font-black tracking-tighter flex items-center gap-1">
                                    <span className="text-muted-foreground text-xl">{po.currency}</span>
                                    {Number(po.totalValue).toLocaleString()}
                                </span>
                            </div>
                            <Separator className="bg-muted/50" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Incoterms</span>
                                    <p className="font-bold text-sm bg-muted/50 px-3 py-1.5 rounded-lg w-fit">{po.incoterms || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Payment</span>
                                    <p className="font-bold text-sm bg-muted/50 px-3 py-1.5 rounded-lg w-fit">{po.paymentTerms || "Net 30"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-white/10">
                        <div className="h-1.5 bg-slate-800 dark:bg-slate-200" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                <PackageIcon className="h-5 w-5 text-slate-500" weight="duotone" />
                                Project Scope
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {po.scope || "No specific scope of work text provided in this document."}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* BOQ Table */}
                    <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden ring-1 ring-white/10">
                        <CardHeader className="bg-muted/30 py-6">
                            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                                <TruckIcon className="h-6 w-6 text-primary" weight="duotone" />
                                Deliverables & Quantity
                            </CardTitle>
                            <CardDescription className="text-base">Specific breakdown of products and materials requested.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/20">
                                    <TableRow className="border-none">
                                        <TableHead className="py-4 px-6 font-bold text-foreground">#</TableHead>
                                        <TableHead className="py-4 px-6 font-bold text-foreground">Description</TableHead>
                                        <TableHead className="py-4 px-6 font-bold text-foreground">Qty / Unit</TableHead>
                                        <TableHead className="py-4 px-6 font-bold text-foreground text-right">Value ({po.currency})</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.boqItems.map((item, idx) => (
                                        <TableRow key={item.id} className="group hover:bg-muted/30 border-muted/30">
                                            <TableCell className="py-5 px-6 font-bold text-muted-foreground">{idx + 1}</TableCell>
                                            <TableCell className="py-5 px-6">
                                                <div className="font-bold">{item.description}</div>
                                                <div className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter mt-0.5">Item Code: {item.itemNumber}</div>
                                            </TableCell>
                                            <TableCell className="py-5 px-6">
                                                <div className="font-bold">{item.quantity} {item.unit}</div>
                                                <div className="text-xs text-muted-foreground">@ {item.unitPrice} / unit</div>
                                            </TableCell>
                                            <TableCell className="py-5 px-6 text-right font-black text-lg group-hover:text-primary transition-colors">
                                                {Number(item.totalPrice).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="bg-muted/10 border-t py-6 px-10 flex justify-between items-center">
                            <span className="font-bold text-muted-foreground uppercase tracking-widest text-sm">Grand Total Amount</span>
                            <span className="text-4xl font-black tracking-tighter">
                                <span className="text-muted-foreground text-xl mr-2 font-medium">{po.currency}</span>
                                {Number(po.totalValue).toLocaleString()}
                            </span>
                        </CardFooter>
                    </Card>

                    {/* Milestones */}
                    {po.milestones.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black tracking-tight px-2 flex items-center gap-2">
                                <CalendarIcon className="h-7 w-7 text-amber-500" weight="duotone" />
                                Payment & Execution Milestones
                            </h3>
                            <div className="grid gap-4">
                                {po.milestones.map((ms) => (
                                    <div key={ms.id} className="group bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-muted/50 hover:border-amber-500/30 transition-all flex items-center justify-between shadow-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
                                                {ms.paymentPercentage || ms.title.substring(0, 1)}
                                            </div>
                                            <div>
                                                <div className="font-black text-lg leading-none mb-1 group-hover:text-amber-600 transition-colors">{ms.title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Target: {ms.expectedDate ? new Date(ms.expectedDate).toLocaleDateString() : "To be scheduled"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Value</div>
                                                <div className="font-bold text-lg">{po.currency} {Number(ms.amount).toLocaleString()}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <PaymentStatusBadge status={(ms as any).payments?.[0]?.status || "NOT_STARTED"} />
                                                <InvoiceUploadSheet
                                                    purchaseOrderId={po.id}
                                                    milestones={[{
                                                        id: ms.id,
                                                        title: ms.title,
                                                        status: ms.status || "NOT_STARTED",
                                                        amount: ms.amount?.toString(),
                                                        paymentPercentage: ms.paymentPercentage?.toString() || "0",
                                                    }]}
                                                    poTotalValue={Number(po.totalValue)}
                                                    trigger={
                                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase">
                                                            Upload Invoice
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Phase 5: Change Orders Section */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                <ArrowsClockwiseIcon className="h-7 w-7 text-indigo-500" weight="duotone" />
                                Change Orders
                            </h3>
                            <ChangeOrderForm
                                purchaseOrderId={po.id}
                                currentPOValue={Number(po.totalValue)}
                                milestones={po.milestones.map(m => ({
                                    id: m.id,
                                    title: m.title,
                                    status: m.status || "NOT_STARTED"
                                }))}
                            />
                        </div>

                        {po.changeOrders?.length > 0 ? (
                            <div className="grid gap-4">
                                {po.changeOrders.map((co: any) => (
                                    <div key={co.id} className="bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-muted/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-black text-sm text-indigo-600">{co.changeNumber}</span>
                                                <COStatusBadge status={co.status} />
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(co.createdAt), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                            <p className="font-bold truncate text-sm">{co.reason}</p>
                                        </div>
                                        <div className="flex items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Impact</div>
                                                <div className={Number(co.amountDelta) >= 0 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                                                    {Number(co.amountDelta) >= 0 ? "+" : ""}
                                                    {po.currency} {Number(co.amountDelta).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Schedule</div>
                                                <div className="font-bold">{co.scheduleImpactDays > 0 ? `+${co.scheduleImpactDays}d` : "—"}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-muted/20 border-2 border-dashed rounded-2xl py-10 text-center">
                                <p className="text-muted-foreground font-medium">No change orders on record.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
