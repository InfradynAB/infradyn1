import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FinanceDeepDiveData,
  LogisticsDeepDiveData,
  QualityDeepDiveData,
  SuppliersDeepDiveData,
} from "@/lib/services/analytics-deep-dive";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function BackHeader({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href={href}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}

function EmptyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SupplierStatusBadge({ status }: { status: string }) {
  const variant =
    status === "ACTIVE"
      ? "default"
      : status === "ONBOARDING" || status === "PENDING"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === "CRITICAL"
      ? "destructive"
      : severity === "MAJOR"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{severity}</Badge>;
}

function LogisticsStatusBadge({ status }: { status: string }) {
  const variant =
    status === "DELIVERED" || status === "PARTIALLY_DELIVERED"
      ? "default"
      : status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY" || status === "DISPATCHED"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

export function FinanceLiveSection({ data }: { data: FinanceDeepDiveData }) {
  return (
    <div className="space-y-6">
      <BackHeader
        href="/dashboard/analytics"
        title="Cost & Payment Dashboard"
        description="Live finance analytics from invoices, cashflow, and payment records."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Committed" value={formatCurrency(data.kpis.totalCommitted, data.kpis.currency)} />
        <StatCard label="Total Paid" value={formatCurrency(data.kpis.totalPaid, data.kpis.currency)} />
        <StatCard label="Pending Amount" value={formatCurrency(data.kpis.totalPending, data.kpis.currency)} helper={`${data.kpis.pendingInvoiceCount} pending invoices`} />
        <StatCard label="Overdue Amount" value={formatCurrency(data.kpis.overdueAmount, data.kpis.currency)} helper={`${data.kpis.overdueInvoiceCount} overdue invoices`} />
        <StatCard label="Avg Payment Cycle" value={`${data.kpis.avgPaymentCycleDays} days`} helper="Based on paid invoices" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cashflow Forecast</CardTitle>
            <CardDescription>Live forecast from milestones and unpaid invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.cashflow.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forecast data available.</p>
            ) : (
              data.cashflow.map((row) => (
                <div key={row.period} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{row.period}</p>
                    <p className="font-semibold">
                      {formatCurrency(row.expectedPayments + row.pendingInvoices, data.kpis.currency)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Approved: {formatCurrency(row.expectedPayments, data.kpis.currency)}</span>
                    <span>Pending: {formatCurrency(row.pendingInvoices, data.kpis.currency)}</span>
                    <span>Exposure: {formatCurrency(row.cumulativeExposure, data.kpis.currency)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Aging</CardTitle>
            <CardDescription>Outstanding invoice buckets using real due dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.agingBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{bucket.label}</p>
                  <p className="text-xs text-muted-foreground">{bucket.count} invoices</p>
                </div>
                <p className="font-semibold">{formatCurrency(bucket.value, data.kpis.currency)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Payment Cycle</CardTitle>
            <CardDescription>Average time to payment by supplier.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Avg Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.paymentCycle.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No paid invoices available yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.paymentCycle.slice(0, 10).map((row) => (
                    <TableRow key={row.supplierName}>
                      <TableCell>{row.supplierName}</TableCell>
                      <TableCell className="text-right">{row.totalInvoices}</TableCell>
                      <TableCell className="text-right">{row.paidInvoices}</TableCell>
                      <TableCell className="text-right">{row.avgPaymentCycleDays}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoice Register</CardTitle>
            <CardDescription>Latest live invoices across your projects.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.invoices.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{row.poNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.supplierName}</TableCell>
                      <TableCell>
                        <Badge variant={row.isOverdue ? "destructive" : "outline"}>
                          {row.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.outstandingAmount, row.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function QualityLiveSection({ data }: { data: QualityDeepDiveData }) {
  return (
    <div className="space-y-6">
      <BackHeader
        href="/dashboard/analytics"
        title="Quality & NCR Analytics"
        description="Live NCR trends, issue types, and supplier quality performance."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total NCRs" value={String(data.kpis.totalNCRs)} />
        <StatCard label="Open NCRs" value={String(data.kpis.openNCRs)} />
        <StatCard label="Critical Open" value={String(data.kpis.criticalNCRs)} />
        <StatCard label="Overdue" value={String(data.kpis.overdueNCRs)} />
        <StatCard label="Closure Rate" value={`${data.kpis.closureRate}%`} />
        <StatCard label="Avg Resolution" value={`${data.kpis.avgResolutionDays} days`} helper={`Impact ${formatCurrency(data.kpis.financialImpact)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly NCR Trend</CardTitle>
            <CardDescription>Opened, closed, and critical NCRs over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.trend.map((row) => (
              <div key={row.month} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{row.month}</p>
                  <p className="text-sm text-muted-foreground">Critical {row.critical}</p>
                </div>
                <div className="mt-2 flex gap-4 text-sm">
                  <span>Opened {row.opened}</span>
                  <span>Closed {row.closed}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Type Breakdown</CardTitle>
            <CardDescription>Most common live NCR issue categories.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.issueBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No NCR issue types recorded.</p>
            ) : (
              data.issueBreakdown.map((row) => (
                <div key={row.issueType} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="font-medium">{row.issueType.replaceAll("_", " ")}</p>
                  <p className="font-semibold">{row.count}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Quality Summary</CardTitle>
            <CardDescription>Open and critical NCRs by supplier.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Critical</TableHead>
                  <TableHead className="text-right">Avg Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.supplierSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No supplier NCR data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.supplierSummary.map((row) => (
                    <TableRow key={row.supplierId}>
                      <TableCell>{row.supplierName}</TableCell>
                      <TableCell className="text-right">{row.total}</TableCell>
                      <TableCell className="text-right">{row.open}</TableCell>
                      <TableCell className="text-right">{row.critical}</TableCell>
                      <TableCell className="text-right">{row.avgResolutionDays}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent NCR Register</CardTitle>
            <CardDescription>Latest live NCRs for tester review.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCR</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.register.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No NCRs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.register.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.ncrNumber}</p>
                          <p className="text-xs text-muted-foreground truncate">{row.title}</p>
                        </div>
                      </TableCell>
                      <TableCell><SeverityBadge severity={row.severity} /></TableCell>
                      <TableCell>
                        <Badge variant={row.isOverdue ? "destructive" : "outline"}>
                          {row.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.supplierName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LogisticsLiveSection({ data }: { data: LogisticsDeepDiveData }) {
  return (
    <div className="space-y-6">
      <BackHeader
        href="/dashboard/analytics"
        title="Logistics Analytics"
        description="Live shipment and carrier analytics from current delivery records."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Shipments" value={String(data.kpis.totalShipments)} />
        <StatCard label="In Transit" value={String(data.kpis.inTransit)} />
        <StatCard label="Delivered On Time" value={String(data.kpis.deliveredOnTime)} />
        <StatCard label="Delayed" value={String(data.kpis.delayedShipments)} />
        <StatCard label="On-Time Rate" value={formatPercent(data.kpis.onTimeRate)} />
        <StatCard label="Avg Delay" value={`${data.kpis.avgDeliveryDelay} days`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Carrier Performance</CardTitle>
            <CardDescription>Live delivery performance by carrier.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead className="text-right">Shipments</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Delayed</TableHead>
                  <TableHead className="text-right">On-Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.carriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No carrier data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.carriers.map((row) => (
                    <TableRow key={row.carrier}>
                      <TableCell>{row.carrier}</TableCell>
                      <TableCell className="text-right">{row.totalShipments}</TableCell>
                      <TableCell className="text-right">{row.delivered}</TableCell>
                      <TableCell className="text-right">{row.delayed}</TableCell>
                      <TableCell className="text-right">{row.onTimeRate}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Shipment Register</CardTitle>
            <CardDescription>Latest live shipment activity.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Transit Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No shipments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.shipments.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.trackingNumber}</p>
                          <p className="text-xs text-muted-foreground">{row.poNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.carrier}</TableCell>
                      <TableCell><LogisticsStatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-right">{row.daysInTransit}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SuppliersLiveSection({ data }: { data: SuppliersDeepDiveData }) {
  if (data.suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <BackHeader
          href="/dashboard/analytics"
          title="Supplier Scorecards"
          description="Live supplier analytics from procurement, delivery, and NCR data."
        />
        <EmptyCard
          title="No supplier analytics yet"
          description="Create purchase orders and supplier activity to populate live scorecards."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackHeader
        href="/dashboard/analytics"
        title="Supplier Scorecards"
        description="Live supplier analytics from procurement, delivery, and NCR data."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Suppliers" value={String(data.summary.totalSuppliers)} />
        <StatCard label="Active Suppliers" value={String(data.summary.activeSuppliers)} />
        <StatCard label="Avg Delivery Score" value={`${data.summary.avgDeliveryScore}`} helper="Derived from on-time delivery" />
        <StatCard label="Avg Quality Score" value={`${data.summary.avgQualityScore}`} helper="Derived from live NCR counts" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Score Table</CardTitle>
          <CardDescription>All values below are calculated from live procurement, delivery, and NCR records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Overall</TableHead>
                <TableHead className="text-right">On-Time</TableHead>
                <TableHead className="text-right">Quality</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead className="text-right">POs</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.suppliers.map((row) => (
                <TableRow key={row.supplierId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.supplierName}</p>
                      <p className="text-xs text-muted-foreground">
                        Physical {row.physicalProgress.toFixed(1)}% / Financial {row.financialProgress.toFixed(1)}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell><SupplierStatusBadge status={row.status} /></TableCell>
                  <TableCell className="text-right font-semibold">{row.overallScore}</TableCell>
                  <TableCell className="text-right">{row.onTimeRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{row.qualityScore}</TableCell>
                  <TableCell className="text-right">{row.riskScore}</TableCell>
                  <TableCell className="text-right">{row.poCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
