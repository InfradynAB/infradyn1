"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, ShieldCheck, Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
    id: string;
    title: string;
    content: string;
    targetId: string;
    position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
    {
        id: "readiness",
        targetId: "tour-readiness",
        title: "Your Readiness Score",
        content: "This score shows how complete your profile is. A higher score builds more trust with buyers and unlocks full portal access.",
        position: "bottom",
    },
    {
        id: "stats",
        targetId: "tour-stats",
        title: "Actionable Insights",
        content: "Track your open NCRs, pending POs, and shipments at a glance. Elements with a red dot require your immediate attention.",
        position: "bottom",
    },
    {
        id: "performance",
        targetId: "tour-performance",
        title: "Performance Tracking",
        content: "We monitor your response rate, reporting accuracy, and reliability. Staying on top of these metrics improves your standing.",
        position: "left",
    },
    {
        id: "milestones",
        targetId: "tour-milestones",
        title: "Upcoming Deadlines",
        content: "Check here for upcoming project milestones. Stay ahead of your schedule and never miss a delivery date.",
        position: "top",
    },
    {
        id: "onboarding",
        targetId: "tour-onboarding",
        title: "Profile & Documents",
        content: "Manage your certifications, company records, and certifications here to stay compliant.",
        position: "top",
    }
];

export function OnboardingTour() {
    const [mounted, setMounted] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("bottom");
    
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });

    // Sync mounted state for Portal
    useEffect(() => {
        setMounted(true);
        const hasSeen = localStorage.getItem("infradyn-supplier-tour-seen");
        if (!hasSeen) {
            setShowWelcome(true);
            setIsVisible(true);
        }
    }, []);

    // Update target coordinates and handle positioning logic
    const updatePosition = useCallback(() => {
        if (currentStep < 0 || currentStep >= TOUR_STEPS.length) return;
        
        const step = TOUR_STEPS[currentStep];
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
    }, [currentStep]);

    // Track scroll and mouse for precise anchoring
    useLayoutEffect(() => {
        if (isVisible && currentStep >= 0) {
            updatePosition();
            window.addEventListener("scroll", updatePosition, { passive: true });
            window.addEventListener("resize", updatePosition);
            
            // Re-check after a short delay for smooth scroll completion
            const timer = setTimeout(updatePosition, 100);
            return () => {
                window.removeEventListener("scroll", updatePosition);
                window.removeEventListener("resize", updatePosition);
                clearTimeout(timer);
            };
        }
    }, [isVisible, currentStep, updatePosition]);

    // Handle scroll into view when step changes
    useEffect(() => {
        if (currentStep >= 0 && currentStep < TOUR_STEPS.length) {
            const target = document.getElementById(TOUR_STEPS[currentStep].targetId);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }
        }
    }, [currentStep]);

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.setItem("infradyn-supplier-tour-seen", "true");
    };

    const handleStart = () => {
        setShowWelcome(false);
        setCurrentStep(0);
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSkip();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
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
    const arrowClass = {
        top: "-bottom-2.5 left-1/2 -translate-x-1/2 border-t-indigo-500/50 border-l-transparent border-r-transparent border-t-[10px] border-l-[10px] border-r-[10px]",
        bottom: "-top-2.5 left-1/2 -translate-x-1/2 border-b-indigo-500/50 border-l-transparent border-r-transparent border-b-[10px] border-l-[10px] border-r-[10px]",
        left: "-right-2.5 top-1/2 -translate-y-1/2 border-l-indigo-500/50 border-t-transparent border-b-transparent border-l-[10px] border-t-[10px] border-b-[10px]",
        right: "-left-2.5 top-1/2 -translate-y-1/2 border-r-indigo-500/50 border-t-transparent border-b-transparent border-r-[10px] border-t-[10px] border-b-[10px]",
    }[placement];

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
                        <div className="h-44 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-10 flex flex-col justify-end relative">
                            <div className="absolute -top-12 -right-12 opacity-10 rotate-12">
                                <ShieldCheck size={240} weight="fill" className="text-white" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2">Welcome.</h2>
                            <p className="text-white/70 text-base font-medium">Ready to explore your new supplier hub?</p>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid gap-6">
                                <div className="flex gap-5 items-start">
                                    <div className="bg-indigo-500/10 p-4 rounded-2xl text-indigo-600">
                                        <Info size={28} weight="duotone" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold">Interactive Walkthrough</h4>
                                        <p className="text-muted-foreground leading-relaxed">A quick tour of the essential metrics and actions that will help you succeed.</p>
                                    </div>
                                </div>
                                <div className="flex gap-5 items-start">
                                    <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-600">
                                        <ShieldCheck size={28} weight="duotone" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold">Compliance First</h4>
                                        <p className="text-muted-foreground leading-relaxed">Keep your certifications up to date and monitor your reliability score in real-time.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-border/40">
                                <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground font-semibold hover:bg-transparent">
                                    I'll explore on my own
                                </Button>
                                <Button onClick={handleStart} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-3 px-8 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95">
                                    Start Tour <ArrowRight size={20} weight="bold" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step Tooltip */}
            {currentStep >= 0 && currentStep < TOUR_STEPS.length && (
                <div 
                    className="absolute pointer-events-auto transition-all duration-300 ease-out"
                    style={tooltipStyle}
                >
                    <div 
                        ref={tooltipRef}
                        className="bg-card border border-border/80 rounded-[1.5rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] p-7 relative animate-in fade-in slide-in-from-top-4 duration-500 group"
                    >
                        {/* Dynamic Arrow */}
                        <div className={cn("absolute w-0 h-0 transition-all duration-300", arrowClass)} />
                        
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-8 bg-indigo-600 rounded-full" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">Step {currentStep + 1} / {TOUR_STEPS.length}</span>
                            </div>
                            <button onClick={handleSkip} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X size={20} weight="bold" className="text-muted-foreground" />
                            </button>
                        </div>
                        
                        <h3 className="text-xl font-extrabold mb-3 tracking-tight">{TOUR_STEPS[currentStep].title}</h3>
                        <p className="text-[15px] text-muted-foreground leading-relaxed mb-8 font-medium italic opacity-90">
                            "{TOUR_STEPS[currentStep].content}"
                        </p>

                        <div className="flex items-center justify-between gap-4 pt-2">
                            <Button variant="ghost" size="sm" onClick={handleBack} className="h-11 px-4 gap-2 font-bold hover:bg-muted text-muted-foreground">
                                <ArrowLeft size={18} weight="bold" /> Back
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="outline" size="sm" onClick={handleSkip} className="h-11 px-5 font-bold border-border/60 rounded-xl">Skip</Button>
                                <Button size="sm" onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 gap-2 font-bold rounded-xl shadow-lg shadow-indigo-600/10">
                                    {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next Step"} <ArrowRight size={18} weight="bold" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(tourUI, document.body);
}
