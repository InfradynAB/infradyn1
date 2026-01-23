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
// Phase 7: NCR/Quality
import { SupplierNCRList } from "@/components/supplier/supplier-ncr-list";

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
        <div className="flex flex-col gap-4 pb-8">

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-muted/30">
                <div className="flex items-center gap-4">
                    {/* Breadcrumb + Title */}
                    <div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                            <StackIcon className="h-3.5 w-3.5" />
                            <span>Procurement</span>
                            <span>/</span>
                            <span className="font-medium text-foreground">{po.poNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight">{po.organization.name}</h1>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${po.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                                po.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    po.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-600'
                                }`}>
                                {po.status}
                            </span>
                        </div>
                    </div>
                </div>
                {/* Right side: Project + Actions */}
                <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground hidden md:block">
                        Project: <span className="font-medium text-foreground">{po.project.name}</span>
                    </p>
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
            </div>

            {/* Key Stats Row - Horizontal */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Value</p>
                    <p className="text-lg font-bold tabular-nums">
                        <span className="text-xs text-muted-foreground mr-1">{po.currency}</span>
                        {Number(po.totalValue).toLocaleString()}
                    </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Issued</p>
                    <p className="text-sm font-medium">{po.createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Incoterms</p>
                    <p className="text-sm font-medium">{po.incoterms || "N/A"}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Payment</p>
                    <p className="text-sm font-medium truncate">{po.paymentTerms || "Net 30"}</p>
                </div>
                {po.scope && (
                    <div className="bg-muted/30 rounded-lg p-3 col-span-2 md:col-span-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Scope</p>
                        <p className="text-xs text-muted-foreground truncate" title={po.scope}>{po.scope}</p>
                    </div>
                )}
            </div>

            {/* Main Content Grid - 3 columns on large screens */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Deliverables - Spans 2 columns */}
                <Card className="lg:col-span-2 border shadow-sm bg-card overflow-hidden">
                    <CardHeader className="py-2.5 px-4 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <TruckIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                Deliverables
                                <span className="text-xs font-normal text-muted-foreground">({po.boqItems.length} items)</span>
                            </CardTitle>
                            <div className="text-xs text-muted-foreground font-medium tabular-nums">
                                {po.currency} {Number(po.boqItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)).toLocaleString()}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[280px] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-muted/60 border-b">
                                    <tr>
                                        <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-8">#</th>
                                        <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wide text-foreground/70">Description</th>
                                        <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-16">Qty</th>
                                        <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-16">Rate</th>
                                        <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wide text-foreground/70 w-24">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-muted/20">
                                    {po.boqItems.map((item, idx) => (
                                        <tr key={item.id} className="group hover:bg-muted/10 transition-colors">
                                            <td className="py-2 px-3 text-xs text-muted-foreground">{idx + 1}</td>
                                            <td className="py-2 px-3">
                                                <p className="text-sm font-medium leading-tight line-clamp-1">{item.description}</p>
                                                <p className="text-[10px] text-muted-foreground/60 font-mono">{item.itemNumber}</p>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <p className="text-sm font-medium tabular-nums">{Number(item.quantity).toLocaleString()}</p>
                                                <p className="text-[10px] text-muted-foreground/60">{item.unit}</p>
                                            </td>
                                            <td className="py-2 px-3 text-right text-sm text-muted-foreground tabular-nums">
                                                {Number(item.unitPrice).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <p className="text-sm font-semibold tabular-nums">{Number(item.totalPrice).toLocaleString()}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Milestones - Right column */}
                {po.milestones.length > 0 && (
                    <Card className="border shadow-sm bg-card overflow-hidden">
                        <CardHeader className="py-2.5 px-4 border-b">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <CalendarIcon className="h-4 w-4 text-muted-foreground" weight="fill" />
                                Milestones
                                <span className="text-xs font-normal text-muted-foreground">({po.milestones.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[280px] overflow-y-auto divide-y divide-muted/20">
                                {po.milestones.map((ms) => (
                                    <div key={ms.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-7 w-7 shrink-0 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                                                {ms.paymentPercentage || ms.title.substring(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{ms.title}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {ms.expectedDate ? new Date(ms.expectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "TBD"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <p className="text-sm font-medium tabular-nums">{po.currency} {Number(ms.amount).toLocaleString()}</p>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ms.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
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
            </div>

            {/* Shipments & Invoices - Side by Side */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Shipments Section */}
                <Card className="border shadow-sm bg-card overflow-hidden">
                    <CardHeader className="py-2.5 px-4 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                <Airplane className="h-4 w-4 text-blue-500" weight="fill" />
                                Shipments
                            </CardTitle>
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
                    </CardHeader>
                    <CardContent className="p-0">
                        {(po as any).shipments && (po as any).shipments.length > 0 ? (
                            <div className="max-h-[200px] overflow-y-auto divide-y divide-muted/20">
                                {(po as any).shipments.map((ship: any) => (
                                    <div key={ship.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded flex items-center justify-center ${ship.status === 'DELIVERED' ? 'bg-green-500/10 text-green-600' :
                                                ship.status === 'IN_TRANSIT' || ship.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500/10 text-blue-600' :
                                                    ship.status === 'EXCEPTION' || ship.status === 'FAILED' ? 'bg-red-500/10 text-red-600' :
                                                        'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                {ship.status === 'DELIVERED' ? (
                                                    <CheckCircle className="h-4 w-4" weight="fill" />
                                                ) : ship.status === 'IN_TRANSIT' || ship.status === 'OUT_FOR_DELIVERY' ? (
                                                    <TruckIcon className="h-4 w-4" weight="fill" />
                                                ) : (
                                                    <PackageIcon className="h-4 w-4" weight="fill" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{ship.trackingNumber || 'No Tracking'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {ship.carrier || 'Unknown'} • {ship.dispatchDate ? new Date(ship.dispatchDate).toLocaleDateString() : 'Pending'}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={`text-[10px] ${ship.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                            ship.status === 'IN_TRANSIT' || ship.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                                                ship.status === 'EXCEPTION' || ship.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                            }`}>
                                            {ship.status?.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-muted-foreground">
                                <Airplane className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No shipments yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Invoices Section */}
                <Card className="border shadow-sm bg-card overflow-hidden">
                    <CardHeader className="py-2.5 px-4 border-b">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <Receipt className="h-4 w-4 text-green-500" weight="fill" />
                            Submitted Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {po.invoices && po.invoices.length > 0 ? (
                            <div className="max-h-[200px] overflow-y-auto divide-y divide-muted/20">
                                {po.invoices.map((inv) => (
                                    <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded flex items-center justify-center ${inv.status === 'APPROVED' || inv.status === 'PAID'
                                                ? 'bg-green-500/10 text-green-600'
                                                : inv.status === 'REJECTED'
                                                    ? 'bg-red-500/10 text-red-600'
                                                    : 'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                {inv.status === 'APPROVED' || inv.status === 'PAID' ? (
                                                    <CheckCircle className="h-4 w-4" weight="fill" />
                                                ) : inv.status === 'REJECTED' ? (
                                                    <ClockCountdown className="h-4 w-4" weight="fill" />
                                                ) : (
                                                    <HourglassHigh className="h-4 w-4" weight="fill" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium">{inv.invoiceNumber}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(inv.invoiceDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium tabular-nums">{po.currency} {Number(inv.amount).toLocaleString()}</p>
                                            <Badge className={`text-[10px] ${inv.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
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
                            <div className="py-6 text-center text-muted-foreground">
                                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No invoices submitted yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* NCR/Quality Issues Section */}
            <SupplierNCRList
                purchaseOrderId={po.id}
                supplierId={supplierData.id}
            />
        </div>
    );
}
