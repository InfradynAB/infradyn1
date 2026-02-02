"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Users, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/themes/mode-toggle";

interface DocsLayoutProps {
    children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
    const [view, setView] = useState<'developer' | 'customer'>('developer');
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    const navItems = [
        { title: "User Roles & Permissions", href: "#user-roles", category: "Getting Started" },
        { title: "Phase 1: Foundation", href: "#phase-1", category: "Getting Started" },
        { title: "Phase 2: Procurement", href: "#phase-2", category: "Core Modules" },
        { title: "Phase 3: Suppliers", href: "#phase-3", category: "Core Modules" },
        { title: "Phase 4: Financials", href: "#phase-4", category: "Core Modules" },
        { title: "Phase 5: AI & OCR", href: "#phase-5", category: "Core Modules" },
        { title: "Phase 6: Logistics", href: "#phase-6", category: "Core Modules" },
        { title: "Phase 7: Quality Excellence", href: "#phase-7", category: "Core Modules" },
        { title: "Phase 8: Analytics", href: "#phase-8", category: "Core Modules" }
    ];

    const filteredResults = searchQuery.trim() === ''
        ? []
        : navItems.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/20 shadow-sm ring-1 ring-primary/5">
                            <Image
                                src="/logos/logo.png"
                                alt="Infradyn Logo"
                                width={24}
                                height={24}
                                className="rounded-sm"
                            />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-foreground">Infradyn <span className="text-primary">Docs</span></span>
                    </div>

                    <div className="flex items-center gap-2 bg-muted p-1 rounded-full border border-border">
                        <Button
                            variant={view === 'developer' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setView('developer')}
                            className={cn(
                                "rounded-full px-6 transition-all",
                                view === 'developer' ? "shadow-sm" : "hover:bg-transparent text-muted-foreground"
                            )}
                        >
                            <Code className="h-4 w-4 mr-2" />
                            Developer
                        </Button>
                        <Button
                            variant={view === 'customer' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setView('customer')}
                            className={cn(
                                "rounded-full px-6 transition-all",
                                view === 'customer' ? "shadow-sm" : "hover:bg-transparent text-muted-foreground"
                            )}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Customer
                        </Button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:flex items-center group">
                            <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                placeholder="Search documentation..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                className="pl-9 pr-4 py-2 text-sm bg-muted/50 border border-transparent hover:border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none rounded-xl w-64 transition-all"
                            />

                            {showResults && filteredResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                                    <div className="py-2">
                                        {filteredResults.map((result, idx) => (
                                            <a
                                                key={idx}
                                                href={result.href}
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setShowResults(false);
                                                }}
                                                className="flex flex-col px-4 py-2 hover:bg-muted transition-colors"
                                            >
                                                <span className="text-sm font-semibold">{result.title}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{result.category}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <ModeToggle />
                    </div>
                </div>
            </header>

            <div className="container flex-1 items-start md:grid md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] gap-6 py-10">
                {/* Sidebar */}
                <aside className="fixed top-24 z-30 hidden h-[calc(100vh-6rem)] w-full shrink-0 md:sticky md:block overflow-y-auto pr-6">
                    <div className="space-y-8">
                        <div>
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Getting Started</h4>
                            <div className="grid grid-flow-row auto-rows-max text-sm gap-2">
                                <a href="#phase-1" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Introduction
                                </a>
                                <a href="#user-roles" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> User Roles & Permissions
                                </a>
                                <a href="#phase-1" className="flex items-center gap-2 text-primary font-medium py-1 px-2 rounded-md bg-muted">
                                    <ChevronRight className="h-3 w-3" /> Phase 1: Foundation
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Core Modules</h4>
                            <div className="grid grid-flow-row auto-rows-max text-sm gap-2">
                                <a href="#phase-2" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 2: Procurement
                                </a>
                                <a href="#phase-3" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 3: Suppliers
                                </a>
                                <a href="#phase-4" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 4: Financials
                                </a>
                                <a href="#phase-5" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 5: AI & OCR
                                </a>
                                <a href="#phase-6" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 6: Logistics
                                </a>
                                <a href="#phase-7" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 7: Quality Excellence
                                </a>
                                <a href="#phase-8" className="flex items-center gap-2 text-muted-foreground hover:text-primary py-1 px-2 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-3 w-3" /> Phase 8: Analytics
                                </a>
                            </div>
                        </div>
                        {view === 'developer' && (
                            <div>
                                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Internal API</h4>
                                <div className="grid grid-flow-row auto-rows-max text-sm gap-2">
                                    <span className="text-muted-foreground py-1 px-2 cursor-not-allowed opacity-50">Endpoints</span>
                                    <span className="text-muted-foreground py-1 px-2 cursor-not-allowed opacity-50">Webhooks</span>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Content */}
                <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_200px]">
                    <div className="mx-auto w-full min-w-0">
                        {children}
                    </div>

                    {/* Right rail TOC */}
                    <div className="hidden text-sm xl:block">
                        <div className="sticky top-24 -mt-10 pt-10">
                            <ScrollArea className="pb-10">
                                <div className="space-y-4">
                                    <p className="font-medium">On This Page</p>
                                    <ul className="m-0 list-none space-y-2">
                                        <li className="font-medium text-primary"><a href="#user-roles">User Roles</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-1">Phase 1</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-2">Phase 2</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-3">Phase 3</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-4">Phase 4</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-5">Phase 5</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-6">Phase 6</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-7">Phase 7</a></li>
                                        <li className="text-muted-foreground hover:text-primary transition-colors"><a href="#phase-8">Phase 8</a></li>
                                    </ul>
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
