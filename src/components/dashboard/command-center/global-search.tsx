"use client";

import { MagnifyingGlass, Command } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
    id: string;
    type: "project" | "po" | "supplier" | "invoice" | "ncr";
    title: string;
    subtitle?: string;
    href: string;
}

interface GlobalSearchProps {
    className?: string;
    placeholder?: string;
}

const typeConfig = {
    project: { label: "Project", color: "bg-blue-500/10 text-blue-500" },
    po: { label: "PO", color: "bg-emerald-500/10 text-emerald-500" },
    supplier: { label: "Supplier", color: "bg-purple-500/10 text-purple-500" },
    invoice: { label: "Invoice", color: "bg-amber-500/10 text-amber-500" },
    ncr: { label: "NCR", color: "bg-red-500/10 text-red-500" },
};

export function GlobalSearch({ className, placeholder = "Search POs, suppliers, invoices..." }: GlobalSearchProps) {
    const router = useRouter();
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

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && results[selectedIndex]) {
            e.preventDefault();
            router.push(results[selectedIndex].href);
            setOpen(false);
        }
    };

    return (
        <>
            {/* Search Trigger Button */}
            <button
                onClick={() => setOpen(true)}
                className={cn(
                    "flex items-center gap-3 w-full max-w-md",
                    "rounded-xl border border-border bg-background/50 backdrop-blur-sm",
                    "px-4 py-3 text-left text-muted-foreground",
                    "transition-all duration-200",
                    "hover:bg-background hover:border-primary/30 hover:shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    className
                )}
            >
                <MagnifyingGlass className="h-5 w-5" />
                <span className="flex-1 text-sm">{placeholder}</span>
                <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
                    <Command className="h-3 w-3" />K
                </kbd>
            </button>

            {/* Search Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Search</DialogTitle>
                    </DialogHeader>
                    
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
                        {query && results.length === 0 && !loading && (
                            <div className="px-4 py-12 text-center text-muted-foreground">
                                <p className="text-sm">No results found for &quot;{query}&quot;</p>
                                <p className="text-xs mt-1">Try searching for a PO number, supplier name, or invoice</p>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="p-2">
                                {results.map((result, index) => (
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
                                                typeConfig[result.type].color
                                            )}
                                        >
                                            {typeConfig[result.type].label}
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

                        {!query && (
                            <div className="px-4 py-8 text-center text-muted-foreground">
                                <p className="text-sm">Start typing to search</p>
                                <p className="text-xs mt-1">
                                    Search across POs, suppliers, invoices, and NCRs
                                </p>
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
                </DialogContent>
            </Dialog>
        </>
    );
}
