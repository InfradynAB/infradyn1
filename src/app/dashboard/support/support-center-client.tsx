"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import {
    ArrowRight,
    ChatTeardropDots,
    Clock,
    Lifebuoy,
    MagnifyingGlass,
    Plus,
    Ticket,
} from "@phosphor-icons/react";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/actions/support-constants";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/actions/support-constants";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type SupportListTicket = {
    id: string;
    ticketNumber: string;
    subject: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    createdAt: string | Date;
    updatedAt?: string | Date | null;
    lastActivityAt?: string | Date | null;
    raiser?: { name: string | null; email: string } | null;
    messages?: Array<{ createdAt: string | Date }>;
};

const STATUS_STYLE: Record<TicketStatus, string> = {
    OPEN: "bg-red-500/10 text-red-600 border-red-500/20",
    IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    AWAITING_USER: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    RESOLVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    CLOSED: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_STYLE: Record<TicketPriority, string> = {
    LOW: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    URGENT: "bg-red-500/10 text-red-600 border-red-500/20",
};

function toDate(value: string | Date | null | undefined): Date {
    if (!value) return new Date(0);
    return value instanceof Date ? value : new Date(value);
}

function getLastUpdated(t: SupportListTicket): Date {
    return (
        toDate(t.lastActivityAt) ||
        toDate(t.updatedAt) ||
        (t.messages?.[0] ? toDate(t.messages[0].createdAt) : undefined) ||
        toDate(t.createdAt)
    );
}

function TicketRow({ ticket }: { ticket: SupportListTicket }) {
    const status = (ticket.status ?? "OPEN") as TicketStatus;
    const priority = (ticket.priority ?? "MEDIUM") as TicketPriority;
    const category = (ticket.category ?? "GENERAL") as TicketCategory;

    const lastUpdated = getLastUpdated(ticket);

    return (
        <Link
            href={`/dashboard/support/${ticket.id}`}
            className="flex items-start gap-4 rounded-xl border border-border/70 p-4 transition-all hover:border-border hover:shadow-sm bg-card"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mt-0.5">
                <Ticket className="h-5 w-5 text-primary" weight="fill" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                    <span
                        className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            STATUS_STYLE[status]
                        )}
                    >
                        {STATUS_LABELS[status]}
                    </span>
                    <span
                        className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            PRIORITY_STYLE[priority]
                        )}
                    >
                        {PRIORITY_LABELS[priority]}
                    </span>
                </div>
                <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{CATEGORY_LABELS[category]}</span>
                    {ticket.raiser?.name && <span>· {ticket.raiser.name}</span>}
                    {ticket.raiser?.email && !ticket.raiser?.name && <span>· {ticket.raiser.email}</span>}
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                    </span>
                </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        </Link>
    );
}

type TabKey = "all" | "open" | "active" | "closed";

type SortKey = "updated" | "newest" | "oldest" | "priority";

export function SupportCenterClient({
    tickets,
    isSuperAdmin,
}: {
    tickets: SupportListTicket[];
    isSuperAdmin: boolean;
}) {
    const [query, setQuery] = useState("");
    const [tab, setTab] = useState<TabKey>("all");
    const [sort, setSort] = useState<SortKey>("updated");

    const counts = useMemo(() => {
        const openCount = tickets.filter(t => t.status === "OPEN").length;
        const activeCount = tickets.filter(t => t.status === "IN_PROGRESS" || t.status === "AWAITING_USER").length;
        const closedCount = tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length;
        return { all: tickets.length, open: openCount, active: activeCount, closed: closedCount };
    }, [tickets]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        let list = tickets;
        if (tab === "open") {
            list = list.filter(t => t.status === "OPEN");
        } else if (tab === "active") {
            list = list.filter(t => t.status === "IN_PROGRESS" || t.status === "AWAITING_USER");
        } else if (tab === "closed") {
            list = list.filter(t => t.status === "RESOLVED" || t.status === "CLOSED");
        }

        if (q) {
            list = list.filter(t => {
                const parts = [
                    t.ticketNumber,
                    t.subject,
                    t.raiser?.name ?? "",
                    isSuperAdmin ? (t.raiser?.email ?? "") : "",
                ]
                    .join(" ")
                    .toLowerCase();
                return parts.includes(q);
            });
        }

        const priorityRank: Record<TicketPriority, number> = {
            URGENT: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
        };

        const sorted = [...list].sort((a, b) => {
            if (sort === "updated") return getLastUpdated(b).getTime() - getLastUpdated(a).getTime();
            if (sort === "newest") return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime();
            if (sort === "oldest") return toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime();
            if (sort === "priority") return priorityRank[b.priority] - priorityRank[a.priority];
            return 0;
        });

        return sorted;
    }, [tickets, tab, query, sort, isSuperAdmin]);

    const isEmptyState = tickets.length === 0 || visible.length === 0;

    return (
        <div className="space-y-5">
            {/* Controls */}
            <div className="grid grid-cols-12 gap-3 items-center">
                <div className="relative col-span-12 lg:col-span-7">
                    <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search…"
                        className="h-9 pl-9"
                    />
                </div>

                <div className="col-span-12 lg:col-span-5 flex justify-end">
                    <ToggleGroup
                        type="single"
                        value={tab}
                        onValueChange={(v) => setTab((v as TabKey) || "all")}
                        variant="outline"
                        size="sm"
                        className="bg-card shrink-0"
                    >
                        <ToggleGroupItem value="all" aria-label="All">
                            All
                            {counts.all > 0 && (
                                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                    {counts.all}
                                </Badge>
                            )}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="open" aria-label="Open">
                            Open
                            {counts.open > 0 && (
                                <Badge variant="destructive" className="ml-2 h-4 px-1 text-[10px]">
                                    {counts.open}
                                </Badge>
                            )}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="active" aria-label="Active">
                            Active
                            {counts.active > 0 && (
                                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                    {counts.active}
                                </Badge>
                            )}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="closed" aria-label="Closed">
                            Closed
                            {counts.closed > 0 && (
                                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                    {counts.closed}
                                </Badge>
                            )}
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                <div className="col-span-12 flex justify-end">
                    <div className="w-full sm:w-[210px] shrink-0">
                        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="updated">Sort by Last Updated</SelectItem>
                                <SelectItem value="newest">Sort by Newest</SelectItem>
                                <SelectItem value="oldest">Sort by Oldest</SelectItem>
                                <SelectItem value="priority">Sort by Priority</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Main */}
            <Card className="border-border/60">
                <CardContent className="p-4 sm:p-6">
                    <div
                        className={cn(
                            "min-h-[420px]",
                            isEmptyState ? "flex items-center justify-center" : ""
                        )}
                    >
                        {tickets.length === 0 ? (
                            <div className="w-full max-w-3xl">
                                <Empty className="border-0 p-0 md:p-0">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <ChatTeardropDots className="size-5" weight="bold" />
                                        </EmptyMedia>
                                        <EmptyTitle>No cases yet</EmptyTitle>
                                        <EmptyDescription>Create a new case to get started</EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button asChild className="bg-primary hover:bg-primary/90">
                                            <Link href="/dashboard/support/new">
                                                <Plus className="mr-2 h-4 w-4" />
                                                Contact Support
                                            </Link>
                                        </Button>
                                    </EmptyContent>
                                </Empty>
                            </div>
                        ) : visible.length === 0 ? (
                            <div className="w-full max-w-3xl">
                                <Empty className="border-0 p-0 md:p-0">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <Lifebuoy className="size-5" weight="fill" />
                                        </EmptyMedia>
                                        <EmptyTitle>No results</EmptyTitle>
                                        <EmptyDescription>Try a different search or filter.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            </div>
                        ) : (
                            <div className="space-y-2 w-full">
                                {visible.map((t) => (
                                    <TicketRow key={t.id} ticket={t} />
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
