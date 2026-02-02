import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function UserRoles() {
    return (
        <section id="user-roles" className="py-16 border-b border-border scroll-mt-20">
            <div className="flex flex-col gap-6 mb-12">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight">User Roles & Permissions</h2>
                <p className="text-xl text-muted-foreground max-w-4xl leading-relaxed">
                    Infradyn uses a granular Role-Based Access Control (RBAC) system to ensure data security and operational efficiency across the procurement lifecycle.
                </p>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[200px] font-bold">Role</TableHead>
                        <TableHead className="font-bold">Key Responsibilities</TableHead>
                        <TableHead className="font-bold">System Access / Permissions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-bold align-top">
                            <Badge variant="secondary" className="mb-2">Project Manager</Badge>
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            Oversees all procurement activities from supplier onboarding to PO tracking, milestone verification, payments, and performance monitoring. Approves supplier data, documents, and deliveries.
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Full access to all modules (Procurement, Supplier, PO, Material Tracking, NCR, Reporting)</li>
                                <li>Manage users, roles, workflows, and approval chains</li>
                                <li>View and edit financial data and payment terms</li>
                            </ul>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold align-top">
                            <Badge variant="secondary" className="mb-2 text-blue-500 border-blue-500/20 bg-blue-500/5">Quality Engineer</Badge>
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            Conducts inspections, creates/uploads NCRs, validates certificates. Tracks material readiness, test results, and delivery quality.
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Access to Material Tracking, NCR Module, Inspection Reports</li>
                                <li>No access to financial or cost analytics</li>
                                <li>Upload images and annotations linked to materials</li>
                            </ul>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold align-top">
                            <Badge variant="secondary" className="mb-2 text-green-500 border-green-500/20 bg-green-500/5">Site Receiver</Badge>
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            Logs and confirms deliveries, uploads delivery notes (CMRs), photos, and comments. Raises NCRs for damaged materials.
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Access to PO Tracking, Delivery Status, and NCR (own deliveries only)</li>
                                <li>No access to cost data or supplier master data</li>
                                <li>Can add comments and upload files tied to their PO/delivery</li>
                            </ul>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold align-top">
                            <Badge variant="secondary" className="mb-2 text-purple-500 border-purple-500/20 bg-purple-500/5">Supplier</Badge>
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            Receives POs, uploads invoices, delivery docs, certificates, and progress updates. Responds to NCRs and comments.
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Access only to assigned POs</li>
                                <li>Upload PDFs, Excel trackers, and delivery evidence</li>
                                <li>No visibility of internal workflows or other suppliers</li>
                            </ul>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold align-top">
                            <Badge variant="secondary" className="mb-2 text-orange-500 border-orange-500/20 bg-orange-500/5">Infradyn Admin</Badge>
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            Manages technical configuration, authentication, role enforcement, and compliance (GDPR, audit logs).
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed align-top">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Technical console, audit logs, encryption, and retention settings</li>
                                <li>No operational control or data edit rights</li>
                            </ul>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </section>
    );
}
