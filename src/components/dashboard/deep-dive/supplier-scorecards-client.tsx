"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowUpDown,
  BarChart3,
  Eye,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface SupplierScore {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING" | "INACTIVE";
  overallScore: number;
  deliveryPerformance: number;
  qualityScore: number;
  complianceScore: number;
  communicationScore: number;
  totalPOs: number;
  activePOs: number;
  totalNCRs: number;
  openNCRs: number;
  onTimeRate: number;
  avgResponseTime: number; // hours
  trend: "up" | "down" | "stable";
}

// ============================================================================
// Mock Data (ready for API replacement)
// ============================================================================

function mockSupplierScores(): SupplierScore[] {
  return [
    {
      id: "s1", name: "Al-Futtaim Steel", status: "ACTIVE",
      overallScore: 87, deliveryPerformance: 92, qualityScore: 85, complianceScore: 90, communicationScore: 78,
      totalPOs: 12, activePOs: 4, totalNCRs: 3, openNCRs: 1, onTimeRate: 92, avgResponseTime: 4.2, trend: "up",
    },
    {
      id: "s2", name: "Emirates Building Systems", status: "ACTIVE",
      overallScore: 74, deliveryPerformance: 70, qualityScore: 80, complianceScore: 75, communicationScore: 68,
      totalPOs: 8, activePOs: 3, totalNCRs: 5, openNCRs: 2, onTimeRate: 70, avgResponseTime: 12.5, trend: "down",
    },
    {
      id: "s3", name: "Danube Building Materials", status: "ACTIVE",
      overallScore: 91, deliveryPerformance: 95, qualityScore: 88, complianceScore: 92, communicationScore: 90,
      totalPOs: 15, activePOs: 6, totalNCRs: 1, openNCRs: 0, onTimeRate: 95, avgResponseTime: 2.1, trend: "up",
    },
    {
      id: "s4", name: "RAK Ceramics", status: "ACTIVE",
      overallScore: 65, deliveryPerformance: 60, qualityScore: 72, complianceScore: 58, communicationScore: 70,
      totalPOs: 6, activePOs: 2, totalNCRs: 7, openNCRs: 3, onTimeRate: 60, avgResponseTime: 18.0, trend: "down",
    },
    {
      id: "s5", name: "Gulf Extrusions", status: "ACTIVE",
      overallScore: 82, deliveryPerformance: 85, qualityScore: 78, complianceScore: 88, communicationScore: 75,
      totalPOs: 10, activePOs: 3, totalNCRs: 2, openNCRs: 0, onTimeRate: 85, avgResponseTime: 6.0, trend: "stable",
    },
    {
      id: "s6", name: "National Paints", status: "PENDING",
      overallScore: 55, deliveryPerformance: 50, qualityScore: 65, complianceScore: 45, communicationScore: 60,
      totalPOs: 3, activePOs: 1, totalNCRs: 4, openNCRs: 2, onTimeRate: 50, avgResponseTime: 24.0, trend: "down",
    },
  ];
}

// ============================================================================
// Helpers
// ============================================================================

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function getScoreBadge(score: number) {
  if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Excellent</Badge>;
  if (score >= 60) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Needs Attention</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200">At Risk</Badge>;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

type SortKey = "overallScore" | "deliveryPerformance" | "qualityScore" | "complianceScore" | "onTimeRate" | "name";

// ============================================================================
// Component
// ============================================================================

export function SupplierScorecardsClient() {
  const [suppliers, setSuppliers] = useState<SupplierScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("overallScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierScore | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    // TODO: Replace with real API call
    const timer = setTimeout(() => {
      setSuppliers(mockSupplierScores());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }, []);

  // Filtered + sorted list
  const filtered = suppliers
    .filter((s) => {
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (performanceFilter === "excellent" && s.overallScore < 80) return false;
      if (performanceFilter === "attention" && (s.overallScore < 60 || s.overallScore >= 80)) return false;
      if (performanceFilter === "risk" && s.overallScore >= 60) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : a[sortKey];
      const bVal = sortKey === "name" ? b.name : b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const comparedSuppliers = suppliers.filter((s) => compareIds.includes(s.id));

  // KPI summary
  const avgScore = suppliers.length > 0 ? Math.round(suppliers.reduce((s, x) => s + x.overallScore, 0) / suppliers.length) : 0;
  const excellentCount = suppliers.filter((s) => s.overallScore >= 80).length;
  const atRiskCount = suppliers.filter((s) => s.overallScore < 60).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/analytics"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Scorecards</h1>
          <p className="text-muted-foreground text-sm">Performance rankings and comparative analysis</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Suppliers</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{suppliers.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avg Reliability Score</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <span className={cn("text-2xl font-bold", getScoreColor(avgScore))}>{avgScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Excellent Performers</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">{excellentCount}</span>
              <span className="text-sm text-muted-foreground">score &ge; 80</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>At Risk</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{atRiskCount}</span>
              <span className="text-sm text-muted-foreground">score &lt; 60</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Performance" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="excellent">Excellent (&ge; 80)</SelectItem>
                <SelectItem value="attention">Needs Attention (60-79)</SelectItem>
                <SelectItem value="risk">At Risk (&lt; 60)</SelectItem>
              </SelectContent>
            </Select>
            {compareIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCompareIds([])}>
                Clear Comparison ({compareIds.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison View */}
      {comparedSuppliers.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Supplier Comparison
            </CardTitle>
            <CardDescription>Side-by-side performance across dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { category: "Delivery", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.deliveryPerformance])) },
                  { category: "Quality", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.qualityScore])) },
                  { category: "Compliance", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.complianceScore])) },
                  { category: "Communication", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.communicationScore])) },
                  { category: "On-Time %", ...Object.fromEntries(comparedSuppliers.map((s) => [s.name, s.onTimeRate])) },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {comparedSuppliers.map((s, i) => (
                    <Radar
                      key={s.id}
                      name={s.name}
                      dataKey={s.name}
                      stroke={["#6366F1", "#EC4899", "#14B8A6"][i]}
                      fill={["#6366F1", "#EC4899", "#14B8A6"][i]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Rankings</CardTitle>
          <CardDescription>{filtered.length} supplier{filtered.length !== 1 ? "s" : ""} found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("name")}>
                      Supplier <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("overallScore")}>
                      Score <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("deliveryPerformance")}>
                      Delivery <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("qualityScore")}>
                      Quality <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("complianceScore")}>
                      Compliance <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort("onTimeRate")}>
                      On-Time <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>NCRs</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, idx) => (
                  <TableRow key={s.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.activePOs} active PO{s.activePOs !== 1 ? "s" : ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("text-lg font-bold", getScoreColor(s.overallScore))}>{s.overallScore}</div>
                      {getScoreBadge(s.overallScore)}
                    </TableCell>
                    <TableCell>
                      <ScoreMiniBar value={s.deliveryPerformance} />
                    </TableCell>
                    <TableCell>
                      <ScoreMiniBar value={s.qualityScore} />
                    </TableCell>
                    <TableCell>
                      <ScoreMiniBar value={s.complianceScore} />
                    </TableCell>
                    <TableCell>
                      <span className={cn("font-mono font-semibold", getScoreColor(s.onTimeRate))}>{s.onTimeRate}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{s.openNCRs}</span>
                        <span className="text-muted-foreground text-xs">/ {s.totalNCRs}</span>
                      </div>
                    </TableCell>
                    <TableCell><TrendIcon trend={s.trend} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant={compareIds.includes(s.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleCompare(s.id)}
                          title="Add to comparison"
                        >
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(s)} title="View scorecard">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Scorecard Detail */}
      {selectedSupplier && (
        <Card className={cn("border-2", getScoreBg(selectedSupplier.overallScore))}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{selectedSupplier.name}</CardTitle>
                <CardDescription>Detailed performance scorecard</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Score Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Category Scores</h3>
                <ScoreRow label="Delivery Performance" value={selectedSupplier.deliveryPerformance} weight={35} />
                <ScoreRow label="Quality (NCR Rate)" value={selectedSupplier.qualityScore} weight={30} />
                <ScoreRow label="Compliance" value={selectedSupplier.complianceScore} weight={20} />
                <ScoreRow label="Communication" value={selectedSupplier.communicationScore} weight={15} />
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Overall Score</span>
                    <span className={cn("text-2xl font-bold", getScoreColor(selectedSupplier.overallScore))}>
                      {selectedSupplier.overallScore}
                    </span>
                  </div>
                </div>
              </div>
              {/* Radar + Stats */}
              <div className="space-y-4">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { category: "Delivery", value: selectedSupplier.deliveryPerformance },
                      { category: "Quality", value: selectedSupplier.qualityScore },
                      { category: "Compliance", value: selectedSupplier.complianceScore },
                      { category: "Communication", value: selectedSupplier.communicationScore },
                      { category: "On-Time", value: selectedSupplier.onTimeRate },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Total POs</p>
                    <p className="text-lg font-bold">{selectedSupplier.totalPOs}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Avg Response</p>
                    <p className="text-lg font-bold">{selectedSupplier.avgResponseTime}h</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Open NCRs</p>
                    <p className="text-lg font-bold">{selectedSupplier.openNCRs}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">On-Time Rate</p>
                    <p className="text-lg font-bold">{selectedSupplier.onTimeRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Distribution</CardTitle>
          <CardDescription>Supplier scores across all categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered.map((s) => ({
                name: s.name.length > 15 ? s.name.slice(0, 15) + "..." : s.name,
                Delivery: s.deliveryPerformance,
                Quality: s.qualityScore,
                Compliance: s.complianceScore,
                Communication: s.communicationScore,
              }))} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Delivery" fill="#6366F1" radius={[0, 2, 2, 0]} />
                <Bar dataKey="Quality" fill="#EC4899" radius={[0, 2, 2, 0]} />
                <Bar dataKey="Compliance" fill="#14B8A6" radius={[0, 2, 2, 0]} />
                <Bar dataKey="Communication" fill="#F97316" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ScoreMiniBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );
}

function ScoreRow({ label, value, weight }: { label: string; value: number; weight: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{weight}% weight</span>
          <span className={cn("font-bold", getScoreColor(value))}>{value}</span>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
