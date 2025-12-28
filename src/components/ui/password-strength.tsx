"use client";

import { Check, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
    password: string;
}

interface Requirement {
    label: string;
    test: (password: string) => boolean;
}

const requirements: Requirement[] = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
    { label: "One number", test: (p) => /[0-9]/.test(p) },
    { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
    const passedCount = requirements.filter((r) => r.test(password)).length;
    const strengthPercentage = (passedCount / requirements.length) * 100;

    const getStrengthColor = () => {
        if (strengthPercentage <= 20) return "bg-red-500";
        if (strengthPercentage <= 40) return "bg-orange-500";
        if (strengthPercentage <= 60) return "bg-amber-500";
        if (strengthPercentage <= 80) return "bg-lime-500";
        return "bg-green-500";
    };

    const getStrengthLabel = () => {
        if (strengthPercentage <= 20) return "Very weak";
        if (strengthPercentage <= 40) return "Weak";
        if (strengthPercentage <= 60) return "Fair";
        if (strengthPercentage <= 80) return "Strong";
        return "Very strong";
    };

    if (!password) return null;

    return (
        <div className="space-y-3 mt-3 p-3 bg-muted/30 rounded-lg border border-muted/50">
            {/* Strength Bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Password strength</span>
                    <span className={cn(
                        "text-xs font-semibold",
                        strengthPercentage === 100 ? "text-green-600" : "text-muted-foreground"
                    )}>
                        {getStrengthLabel()}
                    </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-300 rounded-full", getStrengthColor())}
                        style={{ width: `${strengthPercentage}%` }}
                    />
                </div>
            </div>

            {/* Requirements Checklist */}
            <div className="grid grid-cols-1 gap-1">
                {requirements.map((req, index) => {
                    const passed = req.test(password);
                    return (
                        <div
                            key={index}
                            className={cn(
                                "flex items-center gap-2 text-xs transition-colors",
                                passed ? "text-green-600" : "text-muted-foreground"
                            )}
                        >
                            {passed ? (
                                <Check weight="bold" className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                                <X weight="bold" className="h-3.5 w-3.5 shrink-0 opacity-40" />
                            )}
                            <span className={passed ? "line-through opacity-60" : ""}>
                                {req.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
