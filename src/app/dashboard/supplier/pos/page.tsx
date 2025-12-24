import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/db/drizzle";
import { purchaseOrder, supplier } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr";

export default async function SupplierPOsPage() {
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
        return <div>Error: Supplier profile not found.</div>;
    }

    const pos = await db.query.purchaseOrder.findMany({
        where: eq(purchaseOrder.supplierId, supplierData.id),
        with: {
            project: true,
        },
        orderBy: [desc(purchaseOrder.createdAt)]
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Purchase Orders</h1>
                <p className="text-muted-foreground">Manage and track your assigned purchase orders.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Orders</CardTitle>
                    <CardDescription>A list of all purchase orders issued to your company.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pos.map((po) => (
                                    <TableRow key={po.id}>
                                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                                        <TableCell>{po.project.name}</TableCell>
                                        <TableCell>{po.createdAt.toLocaleDateString()}</TableCell>
                                        <TableCell>{po.currency} {po.totalValue}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                po.status === "ACCEPTED" ? "default" :
                                                    po.status === "PENDING_RESPONSE" ? "destructive" : "secondary"
                                            }>
                                                {po.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/supplier/pos/${po.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <EyeIcon className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
