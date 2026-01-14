import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import db from "@/db/drizzle";
import { purchaseOrder, supplier, invoice, shipment } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupplierPOActions } from "@/components/supplier/po-actions";
import { FileTextIcon, CalendarIcon, PackageIcon, StackIcon, TruckIcon, InvoiceIcon, Receipt, ClockCountdown, CheckCircle, HourglassHigh, Airplane } from "@phosphor-icons/react/dist/ssr";
import { SupplierInvoiceUpload } from "@/components/supplier/invoice-upload";
import { findSupplierForUser } from "@/lib/actions/supplier-lookup";
// Phase 6 Shipment Components
import { ShipmentSubmitForm } from "@/components/supplier/shipment-submit-form";
import { ShipmentStatusCard } from "@/components/supplier/shipment-status-card";
import { ShipmentTimeline } from "@/components/supplier/shipment-timeline";

export default async function SupplierPODetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user || session.user.role !== "SUPPLIER") {
        redirect("/dashboard");
    }

    // Use improved supplier lookup with fallbacks
    const { supplier: supplierData } = await findSupplierForUser(
        session.user.id,
        session.user.email,
        session.user.supplierId
    );

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
            milestones: true,
            organization: true,
            invoices: true,
            shipments: {
                orderBy: desc(shipment.createdAt),
                with: {
                    events: {
                        limit: 1,
                        orderBy: desc(shipment.createdAt),
                    }
                }
            }
        }
    });

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
        <div className="flex flex-col gap-6 pb-16">

            {/* Header Section - Refined Layout */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-muted/30">
                <div className="space-y-1">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <StackIcon className="h-3.5 w-3.5" />
                        <span>Procurement</span>
                        <span>/</span>
                        <span className="font-medium text-foreground">{po.poNumber}</span>
                    </div>
                    {/* Title + Status */}
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{po.organization.name}</h1>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${po.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                            po.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                po.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                            }`}>
                            {po.status}
                        </span>
                    </div>
                    {/* Project */}
                    <p className="text-sm text-muted-foreground">
                        Project: <span className="font-medium text-foreground">{po.project.name}</span>
                    </p>
                </div>
                {/* Actions - Right aligned */}
                <div className="flex items-center gap-2">
                    <SupplierInvoiceUpload
                        purchaseOrderId={po.id}
                        supplierId={supplierData.id}
                        milestones={po.milestones.map(m => ({
                            id: m.id,
                            title: m.title,
                            amount: m.amount || undefined,
                            paymentPercentage: m.paymentPercentage,
                            status: m.status || "PENDING"
                        }))}
                        poTotalValue={Number(po.totalValue)}
                        currency={po.currency}
                    />
                    <SupplierPOActions poId={po.id} currentStatus={po.status} />
                </div>
            </div>


            <div className="grid gap-6 lg:grid-cols-3">
                {/* General Information - Combined Card */}
                <div className="lg:col-span-1">
                    <Card className="border shadow-sm bg-card overflow-hidden">
                        <CardHeader className="py-3 px-4 border-b">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <FileTextIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                General Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 py-4 space-y-4">
                            {/* Total Value - Prominent */}
                            <div className="bg-muted/30 rounded-lg p-3 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Total Value</p>
                                <p className="text-2xl font-bold tabular-nums">
                                    <span className="text-sm text-muted-foreground mr-1">{po.currency}</span>
                                    {Number(po.totalValue).toLocaleString()}
                                </p>
                            </div>

                            {/* Details Grid */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Issued</span>
                                    <span className="text-xs font-medium">{po.createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Incoterms</span>
                                    <span className="text-xs font-medium">{po.incoterms || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Payment</span>
                                    <span className="text-xs font-medium truncate max-w-[140px]">{po.paymentTerms || "Net 30"}</span>
                                </div>
                            </div>

                            {/* Scope - Integrated */}
                            {po.scope && (
                                <div className="pt-2 border-t border-muted">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Scope</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                                        {po.scope}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>


                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* BOQ Table - Refined */}
                    <Card className="border shadow-sm bg-card overflow-hidden">
                        <CardHeader className="py-3 px-4 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <TruckIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                    Deliverables
                                    <span className="text-xs font-normal text-muted-foreground">({po.boqItems.length} items)</span>
                                </CardTitle>
                                {/* Placeholder for future filter/search */}
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    {po.currency} {Number(po.boqItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)).toLocaleString()}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[360px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-muted/60 border-b">
                                        <tr>
                                            <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-10">#</th>
                                            <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wide text-foreground/70">Description</th>
                                            <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-20">Qty</th>
                                            <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-20">Rate</th>
                                            <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-24">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-muted/20">
                                        {po.boqItems.map((item, idx) => (
                                            <tr key={item.id} className="group hover:bg-muted/10 transition-colors">
                                                <td className="py-2 px-3 text-[11px] text-muted-foreground">{idx + 1}</td>
                                                <td className="py-2 px-3">
                                                    <p className="text-[11px] font-medium leading-snug">{item.description}</p>
                                                    <p className="text-[9px] text-muted-foreground/60 mt-0.5 font-mono">{item.itemNumber}</p>
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                    <p className="text-[11px] font-medium tabular-nums">{Number(item.quantity).toLocaleString()}</p>
                                                    <p className="text-[9px] text-muted-foreground/60">{item.unit}</p>
                                                </td>
                                                <td className="py-2 px-3 text-right text-[11px] text-muted-foreground tabular-nums">
                                                    {Number(item.unitPrice).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                    <p className="text-[11px] font-semibold tabular-nums">{Number(item.totalPrice).toLocaleString()}</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>



                    {/* Milestones - Consistent styling */}
                    {po.milestones.length > 0 && (
                        <Card className="border shadow-sm bg-card overflow-hidden">
                            <CardHeader className="py-3 px-4 border-b">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                        Milestones
                                        <span className="text-xs font-normal text-muted-foreground">({po.milestones.length})</span>
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[240px] overflow-y-auto divide-y divide-muted/20">
                                    {po.milestones.map((ms) => (
                                        <div key={ms.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                                                    {ms.paymentPercentage || ms.title.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-medium">{ms.title}</p>
                                                    <p className="text-[9px] text-muted-foreground">
                                                        {ms.expectedDate ? new Date(ms.expectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "TBD"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] font-medium tabular-nums">{po.currency} {Number(ms.amount).toLocaleString()}</p>
                                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${ms.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    ms.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>{ms.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Shipments Section - Phase 6 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                <Airplane className="h-7 w-7 text-blue-500" weight="duotone" />
                                Shipments
                            </h3>
                            <ShipmentSubmitForm
                                purchaseOrderId={po.id}
                                supplierId={supplierData.id}
                                boqItems={po.boqItems.map(item => ({
                                    id: item.id,
                                    description: item.description || '',
                                    quantity: String(item.quantity),
                                    unit: item.unit || 'units',
                                }))}
                            />
                        </div>
                        {(po as any).shipments && (po as any).shipments.length > 0 ? (
                            <div className="grid gap-3">
                                {(po as any).shipments.map((ship: any) => (
                                    <div key={ship.id} className="group bg-card/60 backdrop-blur-md p-5 rounded-xl border border-muted/50 flex items-center justify-between shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${ship.status === 'DELIVERED' ? 'bg-green-500/10 text-green-600' :
                                                    ship.status === 'IN_TRANSIT' || ship.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500/10 text-blue-600' :
                                                        ship.status === 'EXCEPTION' || ship.status === 'FAILED' ? 'bg-red-500/10 text-red-600' :
                                                            'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                {ship.status === 'DELIVERED' ? (
                                                    <CheckCircle className="h-5 w-5" weight="fill" />
                                                ) : ship.status === 'IN_TRANSIT' || ship.status === 'OUT_FOR_DELIVERY' ? (
                                                    <TruckIcon className="h-5 w-5" weight="fill" />
                                                ) : (
                                                    <PackageIcon className="h-5 w-5" weight="fill" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold">{ship.trackingNumber || 'No Tracking'}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {ship.carrier || 'Unknown Carrier'} • {ship.dispatchDate ? new Date(ship.dispatchDate).toLocaleDateString() : 'Pending'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                {ship.supplierAos && (
                                                    <div className="text-xs text-muted-foreground">
                                                        ETA: {new Date(ship.supplierAos).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <Badge className={`font-bold ${ship.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                    ship.status === 'IN_TRANSIT' || ship.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                                                        ship.status === 'EXCEPTION' || ship.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                }`}>
                                                {ship.status?.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed bg-muted/20">
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <Airplane className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No shipments yet</p>
                                    <p className="text-sm mt-1">Submit a shipment to track your delivery</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>



                    {/* Submitted Invoices */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black tracking-tight px-2 flex items-center gap-2">
                            <Receipt className="h-7 w-7 text-green-500" weight="duotone" />
                            Submitted Invoices
                        </h3>
                        {po.invoices && po.invoices.length > 0 ? (
                            <div className="grid gap-3">
                                {po.invoices.map((inv) => (
                                    <div key={inv.id} className="group bg-card/60 backdrop-blur-md p-5 rounded-xl border border-muted/50 flex items-center justify-between shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${inv.status === 'APPROVED' || inv.status === 'PAID'
                                                ? 'bg-green-500/10 text-green-600'
                                                : inv.status === 'REJECTED'
                                                    ? 'bg-red-500/10 text-red-600'
                                                    : 'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                {inv.status === 'APPROVED' || inv.status === 'PAID' ? (
                                                    <CheckCircle className="h-5 w-5" weight="fill" />
                                                ) : inv.status === 'REJECTED' ? (
                                                    <ClockCountdown className="h-5 w-5" weight="fill" />
                                                ) : (
                                                    <HourglassHigh className="h-5 w-5" weight="fill" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold">{inv.invoiceNumber}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(inv.invoiceDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="font-bold text-lg">{po.currency} {Number(inv.amount).toLocaleString()}</div>
                                            </div>
                                            <Badge className={`font-bold ${inv.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                inv.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                                                    inv.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {inv.status?.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed bg-muted/20">
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No invoices submitted yet</p>
                                    <p className="text-sm mt-1">Upload an invoice to request payment</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
