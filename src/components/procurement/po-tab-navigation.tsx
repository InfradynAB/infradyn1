"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    Receipt,
    ArrowsClockwise,
    ClockCounterClockwise,
    WarningCircle,
} from "@phosphor-icons/react";
import {
    ChartLineUp,
    Images,
} from "@phosphor-icons/react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface POTabNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const primaryTabs = [
    { id: "overview", label: "Overview", icon: null },
    { id: "financials", label: "Invoices", icon: Receipt },
    { id: "change-orders", label: "Change Orders", icon: ArrowsClockwise },
    { id: "boq", label: "BOQ / Scope", icon: null },
];

const secondaryTabs = [
    { id: "progress", label: "Deliveries", icon: ChartLineUp },
    { id: "gallery", label: "Documents", icon: Images },
    { id: "quality", label: "Quality / NCR", icon: AlertTriangle },
    { id: "history", label: "History", icon: ClockCounterClockwise },
    { id: "conflicts", label: "Conflicts", icon: WarningCircle },
];

export function POTabNavigation({ activeTab, onTabChange }: POTabNavigationProps) {
    const isSecondaryActive = secondaryTabs.some(tab => tab.id === activeTab);
    const activeSecondaryTab = secondaryTabs.find(tab => tab.id === activeTab);

    return (
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
            {/* Primary Tabs */}
            {primaryTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors",
                            "hover:text-[#1E293B] dark:hover:text-slate-200",
                            isActive
                                ? "text-[#1E293B] dark:text-white"
                                : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {tab.label}
                        
                        {/* Active Indicator - Bold Deep Navy Underline */}
                        {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E293B] dark:bg-white rounded-full" />
                        )}
                    </button>
                );
            })}

            {/* More Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "relative flex items-center gap-1.5 px-4 py-3 h-auto text-sm font-medium rounded-none",
                            "hover:text-[#1E293B] dark:hover:text-slate-200 hover:bg-transparent",
                            isSecondaryActive
                                ? "text-[#1E293B] dark:text-white"
                                : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        {isSecondaryActive && activeSecondaryTab ? (
                            <>
                                {activeSecondaryTab.icon && (
                                    <activeSecondaryTab.icon className="h-4 w-4" />
                                )}
                                {activeSecondaryTab.label}
                            </>
                        ) : (
                            "More"
                        )}
                        <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                        
                        {/* Active Indicator for secondary tabs */}
                        {isSecondaryActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E293B] dark:bg-white rounded-full" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                    {secondaryTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        
                        return (
                            <DropdownMenuItem
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 cursor-pointer",
                                    isActive && "bg-slate-100 dark:bg-slate-800 font-medium"
                                )}
                            >
                                {Icon && <Icon className="h-4 w-4" />}
                                {tab.label}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
