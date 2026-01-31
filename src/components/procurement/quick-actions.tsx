"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    PlusIcon,
    UploadIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    UsersIcon,
    FileTextIcon,
} from "@phosphor-icons/react/dist/ssr";

interface QuickAction {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    variant?: "default" | "outline";
    featured?: boolean;
}

const quickActions: QuickAction[] = [
    {
        title: "Create Purchase Order",
        description: "Start a new PO with AI assistance",
        icon: PlusIcon,
        href: "/dashboard/procurement/new",
        variant: "default",
        featured: true,
    },
    {
        title: "Upload Document",
        description: "Import existing PO or BOQ files",
        icon: UploadIcon,
        href: "/dashboard/procurement/new?step=upload",
        variant: "outline",
    },
    {
        title: "View Reports",
        description: "See spending and progress analytics",
        icon: ChartBarIcon,
        href: "/dashboard/analytics",
        variant: "outline",
    },
    {
        title: "Manage Suppliers",
        description: "Add or update supplier information",
        icon: UsersIcon,
        href: "/dashboard/suppliers",
        variant: "outline",
    },
];

export function QuickActions() {
    return (
        <Card className="border-dashed">
            <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>
                    Common tasks to get you started
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.title}
                                asChild
                                variant={action.variant}
                                className={action.featured 
                                    ? "h-auto flex-col items-start p-5 gap-2 shadow-md hover:shadow-lg transition-shadow" 
                                    : "h-auto flex-col items-start p-4 gap-2"}
                            >
                                <Link href={action.href}>
                                    <div className="flex items-center gap-2 w-full">
                                        <Icon className={action.featured ? "h-6 w-6 shrink-0" : "h-5 w-5 shrink-0"} />
                                        <span className={action.featured ? "font-bold text-base" : "font-semibold text-sm"}>
                                            {action.title}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-left w-full">
                                        {action.description}
                                    </p>
                                </Link>
                            </Button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
