"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Receipt,
    ArrowsClockwise,
    ClockCounterClockwise,
    WarningCircle,
    ChartLineUp,
    Images,
} from "@phosphor-icons/react";
import { AlertTriangle, ChevronDown } from "lucide-react";

interface POTabsWrapperProps {
    children: React.ReactNode;
    defaultTab?: string;
}

const secondaryTabs = [
    { id: "change-orders", label: "Change Orders", icon: ArrowsClockwise },
    { id: "gallery", label: "Documents", icon: Images },
    { id: "quality", label: "Quality / NCR", icon: AlertTriangle },
    { id: "history", label: "History", icon: ClockCounterClockwise },
    { id: "conflicts", label: "Conflicts", icon: WarningCircle },
];

export function POTabsWrapper({ children, defaultTab = "overview" }: POTabsWrapperProps) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const isSecondaryActive = secondaryTabs.some(tab => tab.id === activeTab);
    const activeSecondary = secondaryTabs.find(tab => tab.id === activeTab);

    const tabTriggerStyles = "rounded-none border-b-2 border-transparent data-[state=active]:border-[#1E293B] data-[state=active]:text-[#1E293B] data-[state=active]:font-semibold data-[state=active]:shadow-none data-[state=active]:bg-transparent bg-transparent text-slate-500 hover:text-[#1E293B] px-4 py-3";

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
                <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0 flex-1">
                    {/* Primary Tabs - Always Visible */}
                    <TabsTrigger value="overview" className={tabTriggerStyles}>
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="financials" className={cn(tabTriggerStyles, "gap-1.5")}>
                        <Receipt className="h-4 w-4" />
                        Invoices
                    </TabsTrigger>
                    <TabsTrigger value="progress" className={cn(tabTriggerStyles, "gap-1.5")}>
                        <ChartLineUp className="h-4 w-4" />
                        Deliveries
                    </TabsTrigger>
                    <TabsTrigger value="boq" className={tabTriggerStyles}>
                        BOQ / Scope
                    </TabsTrigger>
                    
                    {/* Hidden triggers for secondary tabs (needed for TabsContent) */}
                    {secondaryTabs.map((tab) => (
                        <TabsTrigger 
                            key={tab.id} 
                            value={tab.id} 
                            className="hidden"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* More Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            className={cn(
                                "h-auto px-4 py-3 text-sm hover:bg-transparent gap-1 rounded-none border-b-2",
                                isSecondaryActive 
                                    ? "text-[#1E293B] font-semibold border-[#1E293B]" 
                                    : "text-slate-500 hover:text-[#1E293B] border-transparent"
                            )}
                        >
                            {isSecondaryActive && activeSecondary ? (
                                <>
                                    {activeSecondary.icon && (
                                        <activeSecondary.icon className="h-4 w-4" />
                                    )}
                                    {activeSecondary.label}
                                </>
                            ) : (
                                "More"
                            )}
                            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {secondaryTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            
                            return (
                                <DropdownMenuItem
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 cursor-pointer",
                                        isActive && "bg-slate-100 dark:bg-slate-800 font-medium"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            {children}
        </Tabs>
    );
}
