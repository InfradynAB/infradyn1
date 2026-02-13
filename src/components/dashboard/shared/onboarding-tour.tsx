"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, ShieldCheck, Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
    id: string;
    title: string;
    content: string;
    targetId: string;
    position: "top" | "bottom" | "left" | "right";
}

interface OnboardingTourProps {
    steps: TourStep[];
    storageKey: string;
    welcomeTitle?: string;
    welcomeSubtitle?: string;
    accentColor?: string; // Tailwind color class like "indigo-600" or hex if used in style
    role?: "supplier" | "pm";
    onStepChange?: (stepIndex: number, stepId: string) => void;
}

export function OnboardingTour({
    steps,
    storageKey,
    welcomeTitle = "Welcome.",
    welcomeSubtitle = "Ready to explore?",
    accentColor = "indigo-600",
    role = "supplier",
    onStepChange
}: OnboardingTourProps) {
    const [mounted, setMounted] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);

    // Robust single-effect initialization
    useEffect(() => {
        setMounted(true);
        try {
            const hasSeen = localStorage.getItem(storageKey);
            const isFresh = !hasSeen || hasSeen === "false" || hasSeen === "null" || hasSeen === "undefined";

            if (isFresh) {
                setIsVisible(true);
                setShowWelcome(true);
            }
        } catch (e) {
            setIsVisible(true);
            setShowWelcome(true);
        }
    }, [storageKey]);




    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("bottom");

    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });




    // Update target coordinates and handle positioning logic
    const updatePosition = useCallback(() => {
        if (currentStep < 0 || currentStep >= steps.length) return;

        const step = steps[currentStep];
        const target = document.getElementById(step.targetId);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        // Update target coords
        setCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        });

        // Determine best placement based on available space (Auto-flip logic)
        let bestPlacement = step.position;
        const padding = 20;
        const tHeight = tooltipRef.current?.offsetHeight || 200;
        const tWidth = 320;

        if (step.position === "top" && rect.top < tHeight + padding) {
            bestPlacement = "bottom";
        } else if (step.position === "bottom" && vh - rect.bottom < tHeight + padding) {
            bestPlacement = "top";
        } else if (step.position === "left" && rect.left < tWidth + padding) {
            bestPlacement = "right";
        } else if (step.position === "right" && vw - rect.right < tWidth + padding) {
            bestPlacement = "left";
        }

        setPlacement(bestPlacement);
        if (tooltipRef.current) {
            setTooltipSize({
                width: tooltipRef.current.offsetWidth,
                height: tooltipRef.current.offsetHeight
            });
        }
    }, [currentStep, steps]);

    // Track scroll, resize and polling for precise anchoring even during re-renders/loading
    useLayoutEffect(() => {
        if (isVisible && currentStep >= 0) {
            updatePosition();
            window.addEventListener("scroll", updatePosition, { passive: true });
            window.addEventListener("resize", updatePosition);

            // Polling check to handle dynamic content loads/skeleton unmounting
            const pollTimer = setInterval(updatePosition, 1000);

            // Re-check after a short delay for smooth scroll completion
            const timer = setTimeout(updatePosition, 100);

            return () => {
                window.removeEventListener("scroll", updatePosition);
                window.removeEventListener("resize", updatePosition);
                clearInterval(pollTimer);
                clearTimeout(timer);
            };
        }
    }, [isVisible, currentStep, updatePosition]);


    // Handle scroll into view when step changes
    useEffect(() => {
        if (currentStep >= 0 && currentStep < steps.length) {
            const target = document.getElementById(steps[currentStep].targetId);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }
        }
    }, [currentStep, steps]);

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.setItem(storageKey, "true");
    };

    const handleStart = () => {
        setShowWelcome(false);
        setCurrentStep(0);
        if (onStepChange && steps[0]) {
            onStepChange(0, steps[0].id);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            const newStep = currentStep + 1;
            setCurrentStep(newStep);
            if (onStepChange) {
                onStepChange(newStep, steps[newStep].id);
            }
        } else {
            handleSkip();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            const newStep = currentStep - 1;
            setCurrentStep(newStep);
            if (onStepChange) {
                onStepChange(newStep, steps[newStep].id);
            }
        } else {
            setShowWelcome(true);
            setCurrentStep(-1);
        }
    };

    if (!mounted || !isVisible) return null;

    // Position calculation for tooltip
    const getTooltipStyle = () => {
        const gap = 16;
        let tTop = 0;
        let tLeft = 0;

        if (placement === "top") {
            tTop = coords.top - tooltipSize.height - gap;
            tLeft = coords.left + (coords.width / 2) - (tooltipSize.width / 2);
        } else if (placement === "bottom") {
            tTop = coords.top + coords.height + gap;
            tLeft = coords.left + (coords.width / 2) - (tooltipSize.width / 2);
        } else if (placement === "left") {
            tTop = coords.top + (coords.height / 2) - (tooltipSize.height / 2);
            tLeft = coords.left - tooltipSize.width - gap;
        } else if (placement === "right") {
            tTop = coords.top + (coords.height / 2) - (tooltipSize.height / 2);
            tLeft = coords.left + coords.width + gap;
        }

        // Final Viewport Clamping
        const margin = 12;
        tTop = Math.max(margin, Math.min(tTop, window.innerHeight - tooltipSize.height - margin));
        tLeft = Math.max(margin, Math.min(tLeft, window.innerWidth - tooltipSize.width - margin));

        return { top: tTop, left: tLeft, width: tooltipSize.width };
    };

    const tooltipStyle = getTooltipStyle();

    // Theme mapping for border and arrow colors
    const themeColors = {
        "indigo-600": "border-indigo-500/50",
        "teal-600": "border-teal-500/50",
        "cyan-700": "border-cyan-600/50",
    } as const;

    const accentBorder = accentColor === "teal-600" ? "border-teal-500/50" : "border-indigo-500/50";
    const accentBg = accentColor === "teal-600" ? "bg-teal-600" : "bg-indigo-600";
    const accentHover = accentColor === "teal-600" ? "hover:bg-teal-700" : "hover:bg-indigo-700";
    const accentText = accentColor === "teal-600" ? "text-teal-600" : "text-indigo-600";
    const accentShadow = accentColor === "teal-600" ? "shadow-teal-600/10" : "shadow-indigo-600/10";

    const arrowBorderClass = {
        top: `border-t-${accentColor}/50`,
        bottom: `border-b-${accentColor}/50`,
        left: `border-l-${accentColor}/50`,
        right: `border-r-${accentColor}/50`,
    }[placement];

    // Manual arrow style override to ensure visibility with dynamic colors
    const getArrowStyle = () => {
        const base = "absolute w-0 h-0 transition-all duration-300";
        const color = accentColor === "teal-600" ? "rgba(20, 184, 166, 0.5)" : "rgba(79, 70, 229, 0.5)";

        switch (placement) {
            case "top": return { style: { borderTop: `10px solid ${color}`, borderLeft: "10px solid transparent", borderRight: "10px solid transparent" }, className: cn(base, "-bottom-2.5 left-1/2 -translate-x-1/2") };
            case "bottom": return { style: { borderBottom: `10px solid ${color}`, borderLeft: "10px solid transparent", borderRight: "10px solid transparent" }, className: cn(base, "-top-2.5 left-1/2 -translate-x-1/2") };
            case "left": return { style: { borderLeft: `10px solid ${color}`, borderTop: "10px solid transparent", borderBottom: "10px solid transparent" }, className: cn(base, "-right-2.5 top-1/2 -translate-y-1/2") };
            case "right": return { style: { borderRight: `10px solid ${color}`, borderTop: "10px solid transparent", borderBottom: "10px solid transparent" }, className: cn(base, "-left-2.5 top-1/2 -translate-y-1/2") };
        }
    };
    const arrow = getArrowStyle();

    const tourUI = (
        <div className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden font-sans">
            {/* Spotlight Overlay */}
            {currentStep >= 0 && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto transition-all duration-500 ease-in-out"
                    style={{
                        clipPath: `polygon(
                            0% 0%, 0% 100%, 
                            ${coords.left}px 100%, 
                            ${coords.left}px ${coords.top}px, 
                            ${coords.left + coords.width}px ${coords.top}px, 
                            ${coords.left + coords.width}px ${coords.top + coords.height}px, 
                            ${coords.left}px ${coords.top + coords.height}px, 
                            ${coords.left}px 100%, 
                            100% 100%, 100% 0%
                        )`
                    }}
                />
            )}

            {/* Welcome Screen */}
            {showWelcome && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md pointer-events-auto p-4 transition-opacity duration-300">
                    <div className="bg-card border border-border/60 rounded-[2rem] overflow-hidden max-w-xl w-full shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
                        <div className={cn("h-44 p-10 flex flex-col justify-end relative",
                            role === "pm"
                                ? "bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800"
                                : "bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700"
                        )}>
                            <div className="absolute -top-12 -right-12 opacity-10 rotate-12">
                                <ShieldCheck size={240} weight="fill" className="text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2">{welcomeTitle}</h2>
                            <p className="text-white/70 text-base font-medium">{welcomeSubtitle}</p>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid gap-6">
                                <div className="flex gap-5 items-start">
                                    <div className={cn("p-4 rounded-2xl", role === "pm" ? "bg-teal-500/10 text-teal-600" : "bg-indigo-500/10 text-indigo-600")}>
                                        <Info size={28} weight="duotone" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold">Interactive Walkthrough</h4>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {role === "pm"
                                                ? "Explore the power of your command center and learn how to manage project health efficiently."
                                                : "A quick tour of the essential metrics and actions that will help you succeed."
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-5 items-start">
                                    <div className={cn("p-4 rounded-2xl", role === "pm" ? "bg-cyan-500/10 text-cyan-600" : "bg-emerald-500/10 text-emerald-600")}>
                                        <ShieldCheck size={28} weight="duotone" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold">{role === "pm" ? "Data Visibility" : "Compliance First"}</h4>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {role === "pm"
                                                ? "Get real-time insights into supplier risks, costs, and project milestones."
                                                : "Keep your certifications up to date and monitor your reliability score in real-time."
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-border/40">
                                <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground font-semibold hover:bg-transparent">
                                    I'll explore on my own
                                </Button>
                                <Button onClick={handleStart} className={cn("text-white gap-3 px-8 h-14 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95", accentBg, accentHover, role === "pm" ? "shadow-teal-600/20" : "shadow-indigo-600/20")}>
                                    Start Tour <ArrowRight size={20} weight="bold" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Tooltip */}
            {currentStep >= 0 && currentStep < steps.length && (
                <div
                    className="absolute pointer-events-auto transition-all duration-300 ease-out"
                    style={tooltipStyle}
                >
                    <div
                        ref={tooltipRef}
                        className={cn("bg-card border rounded-[1.5rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] p-7 relative animate-in fade-in slide-in-from-top-4 duration-500 group", accentBorder)}
                    >
                        {/* Dynamic Arrow */}
                        <div className={arrow.className} style={arrow.style} />

                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className={cn("h-1.5 w-8 rounded-full", accentBg)} />
                                <span className={cn("text-[11px] font-black uppercase tracking-[0.2em]", accentText)}>Step {currentStep + 1} / {steps.length}</span>
                            </div>
                            <button onClick={handleSkip} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X size={20} weight="bold" className="text-muted-foreground" />
                            </button>
                        </div>

                        <h3 className="text-xl font-extrabold mb-3 tracking-tight">{steps[currentStep].title}</h3>
                        <p className="text-[15px] text-muted-foreground leading-relaxed mb-8 font-medium italic opacity-90">
                            "{steps[currentStep].content}"
                        </p>

                        <div className="flex items-center justify-between gap-4 pt-2">
                            <Button variant="ghost" size="sm" onClick={handleBack} className="h-11 px-4 gap-2 font-bold hover:bg-muted text-muted-foreground">
                                <ArrowLeft size={18} weight="bold" /> Back
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" onClick={handleSkip} className="h-11 px-5 font-bold border-border/60 rounded-xl">Skip</Button>
                                <Button size="sm" onClick={handleNext} className={cn("text-white h-11 px-6 gap-2 font-bold rounded-xl shadow-lg", accentBg, accentHover, accentShadow)}>
                                    {currentStep === steps.length - 1 ? "Finish" : "Next Step"} <ArrowRight size={18} weight="bold" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (!mounted) return null;
    return createPortal(tourUI, document.body);
}


