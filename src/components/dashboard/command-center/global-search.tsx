"use client";

import { MagnifyingGlass, Command } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
    id: string;
    type: "project" | "po" | "supplier" | "invoice" | "ncr" | "quick";
    title: string;
    subtitle?: string;
    href: string;
}

interface QuickAction {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    keywords: string[];
}

interface GlobalSearchProps {
    className?: string;
    placeholder?: string;
    variant?: "bar" | "icon";
}

const typeConfig = {
    project: { label: "Project", color: "bg-blue-500/10 text-blue-500" },
    po: { label: "PO", color: "bg-emerald-500/10 text-emerald-500" },
    supplier: { label: "Supplier", color: "bg-purple-500/10 text-purple-500" },
    invoice: { label: "Invoice", color: "bg-amber-500/10 text-amber-500" },
    ncr: { label: "NCR", color: "bg-red-500/10 text-red-500" },
    quick: { label: "Quick", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
};

const defaultQuickActions: QuickAction[] = [
    {
        id: "quick-dashboard",
        title: "Dashboard",
        subtitle: "Go to your dashboard overview",
        href: "/dashboard",
        keywords: ["home", "overview", "main", "dashboard"],
    },
    {
        id: "quick-analytics",
        title: "Analytics",
        subtitle: "View analytics and performance trends",
        href: "/dashboard/analytics",
        keywords: ["analytics", "reports", "insights", "metrics"],
    },
    {
        id: "quick-procurement",
        title: "Procurement",
        subtitle: "Manage purchase orders and workflows",
        href: "/dashboard/procurement",
        keywords: ["procurement", "purchase orders", "po", "orders"],
    },
    {
        id: "quick-suppliers",
        title: "Suppliers",
        subtitle: "Open suppliers management",
        href: "/dashboard/suppliers",
        keywords: ["suppliers", "supplies", "vendors", "partners"],
    },
    {
        id: "quick-invoices",
        title: "Invoices",
        subtitle: "Open invoice tracking in procurement",
        href: "/dashboard/procurement?tab=invoices",
        keywords: ["invoice", "invoices", "billing", "payments", "finance"],
    },
    {
        id: "quick-deliveries",
        title: "Deliveries",
        subtitle: "Track delivery and logistics updates",
        href: "/dashboard/procurement?tab=deliveries",
        keywords: ["delivery", "deliveries", "shipment", "shipments", "logistics"],
    },
    {
        id: "quick-materials",
        title: "Materials Tracker",
        subtitle: "Check materials and site supply movement",
        href: "/dashboard/procurement?tab=material-tracker",
        keywords: ["materials", "material", "tracker", "inventory", "supplies"],
    },
    {
        id: "quick-projects",
        title: "Projects",
        subtitle: "Open projects and portfolio management",
        href: "/dashboard/projects",
        keywords: ["projects", "portfolio", "sites"],
    },
    {
        id: "quick-alerts",
        title: "Alerts",
        subtitle: "Review quality, logistics, and risk alerts",
        href: "/dashboard/alerts",
        keywords: ["alerts", "notifications", "issues", "risks"],
    },
    {
        id: "quick-support",
        title: "Support",
        subtitle: "Go to support and help center",
        href: "/dashboard/support",
        keywords: ["support", "help", "assistance", "ticket"],
    },
    {
        id: "quick-settings",
        title: "Settings",
        subtitle: "Configure workspace and account settings",
        href: "/dashboard/settings",
        keywords: ["settings", "preferences", "config", "configuration"],
    },
];

const supplierQuickActions: QuickAction[] = [
    {
        id: "quick-supplier-dashboard",
        title: "Dashboard",
        subtitle: "Go to supplier dashboard",
        href: "/dashboard/supplier",
        keywords: ["dashboard", "home", "overview", "supplier"],
    },
    {
        id: "quick-supplier-analytics",
        title: "Analytics",
        subtitle: "Open supplier analytics",
        href: "/dashboard/supplier/analytics",
        keywords: ["analytics", "reports", "insights", "supplier"],
    },
    {
        id: "quick-supplier-pos",
        title: "My POs",
        subtitle: "View purchase orders assigned to you",
        href: "/dashboard/supplier/pos",
        keywords: ["po", "purchase order", "orders", "my pos"],
    },
    {
        id: "quick-supplier-invoices",
        title: "Invoices",
        subtitle: "Open supplier invoice analytics",
        href: "/dashboard/supplier/analytics/invoices",
        keywords: ["invoice", "invoices", "billing", "payments", "finance"],
    },
    {
        id: "quick-supplier-deliveries",
        title: "Deliveries",
        subtitle: "Track supplier deliveries",
        href: "/dashboard/supplier/analytics/deliveries",
        keywords: ["delivery", "deliveries", "shipment", "logistics"],
    },
    {
        id: "quick-supplier-compliance",
        title: "Compliance",
        subtitle: "Open profile and compliance onboarding",
        href: "/dashboard/supplier/onboarding",
        keywords: ["compliance", "profile", "onboarding", "documents"],
    },
    {
        id: "quick-supplier-support",
        title: "Support",
        subtitle: "Go to support and help center",
        href: "/dashboard/support",
        keywords: ["support", "help", "assistance", "ticket"],
    },
];

const receiverQuickActions: QuickAction[] = [
    {
        id: "quick-receiver-dashboard",
        title: "Dashboard",
        subtitle: "Go to site receiver dashboard",
        href: "/dashboard/receiver",
        keywords: ["dashboard", "home", "overview", "receiver"],
    },
    {
        id: "quick-receiver-deliveries",
        title: "Deliveries",
        subtitle: "Open incoming shipments and confirmations",
        href: "/dashboard/receiver/deliveries",
        keywords: ["delivery", "deliveries", "shipment", "incoming"],
    },
    {
        id: "quick-receiver-po-tracking",
        title: "PO Tracking",
        subtitle: "Track purchase order delivery progress",
        href: "/dashboard/receiver/pos",
        keywords: ["po", "purchase order", "tracking", "orders"],
    },
    {
        id: "quick-receiver-ncr",
        title: "NCRs",
        subtitle: "Manage non-conformance reports",
        href: "/dashboard/receiver/ncr",
        keywords: ["ncr", "quality", "issue", "non conformance"],
    },
    {
        id: "quick-receiver-support",
        title: "Support",
        subtitle: "Go to support and help center",
        href: "/dashboard/support",
        keywords: ["support", "help", "assistance", "ticket"],
    },
];

export function GlobalSearch({
    className,
    placeholder = "Search POs, suppliers, invoices...",
    variant = "bar",
}: GlobalSearchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [open]);

    // Search debounce
    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data.results || []);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => search(query), 300);
        return () => clearTimeout(timer);
    }, [query, search]);

    const quickActions = useMemo(() => {
        if (pathname.startsWith("/dashboard/supplier")) {
            return supplierQuickActions;
        }
        if (pathname.startsWith("/dashboard/receiver")) {
            return receiverQuickActions;
        }
        return defaultQuickActions;
    }, [pathname]);

    const quickActionResults = useMemo<SearchResult[]>(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const filtered = normalizedQuery
            ? quickActions.filter((action) => {
                const haystack = `${action.title} ${action.subtitle} ${action.keywords.join(" ")}`.toLowerCase();
                return haystack.includes(normalizedQuery);
            })
            : quickActions;

        return filtered.map((action) => ({
            id: action.id,
            type: "quick",
            title: action.title,
            subtitle: action.subtitle,
            href: action.href,
        }));
    }, [quickActions, query]);

    const displayResults = useMemo(
        () => (query.trim() ? [...quickActionResults, ...results] : quickActionResults),
        [query, quickActionResults, results]
    );

    useEffect(() => {
        setSelectedIndex((index) => {
            if (displayResults.length === 0) return 0;
            return Math.min(index, displayResults.length - 1);
        });
    }, [displayResults]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, Math.max(displayResults.length - 1, 0)));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && displayResults[selectedIndex]) {
            e.preventDefault();
            router.push(displayResults[selectedIndex].href);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {variant === "icon" ? (
                    <button
                        type="button"
                        aria-label="Search"
                        className={cn(
                            "inline-flex h-10 w-10 items-center justify-center",
                            "rounded-xl border border-border bg-background/50 backdrop-blur-sm",
                            "text-muted-foreground transition-all duration-200",
                            "hover:bg-background hover:border-primary/30 hover:text-foreground hover:shadow-sm",
                            "focus:outline-none focus:ring-2 focus:ring-primary/20",
                            className
                        )}
                    >
                        <MagnifyingGlass className="h-5 w-5" />
                        <span className="sr-only">Search</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-3 w-full max-w-md",
                            "rounded-xl border border-border bg-background/50 backdrop-blur-sm",
                            "px-4 py-3 text-left text-muted-foreground",
                            "transition-all duration-200",
                            "hover:bg-background hover:border-primary/30 hover:shadow-sm",
                            "focus:outline-none focus:ring-2 focus:ring-primary/20",
                            "text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground",
                            className
                        )}
                    >
                        <MagnifyingGlass className="h-5 w-5 text-current" />
                        <span className="flex-1 text-sm">{placeholder}</span>
                        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 font-sans tabular-nums text-[10px] font-medium text-muted-foreground">
                            <Command className="h-3 w-3" />K
                        </kbd>
                    </button>
                )}
            </PopoverTrigger>

            <PopoverContent
                align={variant === "icon" ? "end" : "center"}
                side="bottom"
                sideOffset={8}
                onOpenAutoFocus={(event) => event.preventDefault()}
                className={cn(
                    "z-50 p-0 gap-0 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-xl",
                    variant === "icon"
                        ? "w-[min(92vw,36rem)]"
                        : "w-(--radix-popover-trigger-width) max-w-2xl"
                )}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                    <MagnifyingGlass className="h-5 w-5 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search for POs, suppliers, invoices, NCRs..."
                        className="border-0 p-0 text-base focus-visible:ring-0 placeholder:text-muted-foreground/60"
                    />
                    {loading && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {query && displayResults.length === 0 && !loading && (
                        <div className="px-4 py-12 text-center text-muted-foreground">
                            <p className="text-sm">No results found for &quot;{query}&quot;</p>
                            <p className="text-xs mt-1">Try searching for analytics, suppliers, invoices, support, or deliveries</p>
                        </div>
                    )}

                    {displayResults.length > 0 && (
                        <div className="p-2">
                            {displayResults.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={() => {
                                        router.push(result.href);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left",
                                        "transition-colors duration-150",
                                        index === selectedIndex
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-accent/50"
                                    )}
                                >
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "text-[10px] font-medium px-2",
                                            typeConfig[result.type]?.color
                                        )}
                                    >
                                        {typeConfig[result.type]?.label ?? "Result"}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{result.title}</p>
                                        {result.subtitle && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {result.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <kbd className="rounded border px-1.5 py-0.5 bg-muted">↑</kbd>
                        <kbd className="rounded border px-1.5 py-0.5 bg-muted">↓</kbd>
                        to navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="rounded border px-1.5 py-0.5 bg-muted">↵</kbd>
                        to select
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="rounded border px-1.5 py-0.5 bg-muted">esc</kbd>
                        to close
                    </span>
                </div>
            </PopoverContent>
        </Popover>
    );
}
