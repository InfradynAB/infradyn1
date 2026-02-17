"use client";

/**
 * AIAssistantWidget — Floating Chat Widget
 *
 * A bottom-right floating action button that expands into
 * a polished chat panel. Includes welcome message with
 * quick-start suggestions.
 */

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Sparkle, X, PaperPlaneTilt, Trash, CaretDown } from "@phosphor-icons/react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { AIMessage } from "./ai-message";
import { cn } from "@/lib/utils";

// ============================================================================
// Quick-start prompts (role-aware)
// ============================================================================

const PM_SUGGESTIONS = [
    "What's my project status?",
    "Any overdue items?",
    "Show me open NCRs",
    "How do I create a PO?",
];

const SUPPLIER_SUGGESTIONS = [
    "What are my pending tasks?",
    "Any open NCRs for me?",
    "Track my shipments",
    "How do I submit an invoice?",
];

// ============================================================================
// Props
// ============================================================================

interface AIAssistantWidgetProps {
    user: { name: string; role?: string };
    activeOrgId?: string | null;
    activeProjectId?: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function AIAssistantWidget({ user }: AIAssistantWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const isSupplier = user.role === "SUPPLIER";

    const suggestions = isSupplier ? SUPPLIER_SUGGESTIONS : PM_SUGGESTIONS;

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    // Send handler
    const handleSend = async (text?: string) => {
        const content = text ?? input.trim();
        if (!content) return;
        setInput("");
        await sendMessage(content);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        handleSend();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* ---- Floating Action Button ---- */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    "fixed bottom-6 right-6 z-[99] rounded-full shadow-2xl transition-all duration-300",
                    "w-14 h-14 flex items-center justify-center",
                    "bg-gradient-to-br from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500",
                    "text-white hover:scale-110 active:scale-95",
                    "ring-4 ring-cyan-600/20 hover:ring-cyan-500/30",
                    isOpen && "scale-0 pointer-events-none opacity-0",
                )}
                aria-label="Open AI Assistant"
            >
                <Sparkle className="w-6 h-6" weight="fill" />
                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-full bg-cyan-600/30 animate-ping" />
            </button>

            {/* ---- Chat Panel ---- */}
            <div
                className={cn(
                    "fixed bottom-6 right-6 z-[100] w-[400px] h-[560px]",
                    "flex flex-col rounded-2xl shadow-2xl overflow-hidden",
                    "bg-background/95 backdrop-blur-xl border border-border/50",
                    "transition-all duration-300 origin-bottom-right",
                    isOpen
                        ? "scale-100 opacity-100 translate-y-0"
                        : "scale-90 opacity-0 translate-y-4 pointer-events-none",
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-700 to-cyan-600 text-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                            <Sparkle className="w-4 h-4" weight="fill" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm leading-none">Infradyn AI</h3>
                            <p className="text-xs text-white/70 mt-0.5">Your procurement copilot</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={clearMessages}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                title="Clear conversation"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="Close"
                        >
                            <X className="w-4 h-4" weight="bold" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
                    {messages.length === 0 ? (
                        <WelcomeView
                            userName={user.name?.split(" ")[0] ?? "there"}
                            suggestions={suggestions}
                            onSuggestionClick={handleSend}
                        />
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <AIMessage key={msg.id} message={msg} />
                            ))}
                        </>
                    )}

                    {error && (
                        <div className="text-xs text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                            {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form
                    onSubmit={handleSubmit}
                    className="flex items-end gap-2 px-4 py-3 border-t border-border/50 bg-background/50"
                >
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything…"
                        rows={1}
                        className={cn(
                            "flex-1 resize-none bg-muted/40 rounded-xl px-3.5 py-2.5",
                            "text-sm placeholder:text-muted-foreground/60",
                            "border border-border/40 focus:border-cyan-600/50 focus:ring-1 focus:ring-cyan-600/20",
                            "outline-none transition-all max-h-24",
                        )}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={cn(
                            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                            input.trim()
                                ? "bg-cyan-700 text-white hover:bg-cyan-600 shadow-md"
                                : "bg-muted text-muted-foreground",
                        )}
                    >
                        <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                    </button>
                </form>
            </div>
        </>
    );
}

// ============================================================================
// Welcome View (shown when no messages)
// ============================================================================

function WelcomeView({
    userName,
    suggestions,
    onSuggestionClick,
}: {
    userName: string;
    suggestions: string[];
    onSuggestionClick: (text: string) => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-700/20 to-cyan-600/20 flex items-center justify-center mb-4">
                <Sparkle className="w-7 h-7 text-cyan-700" weight="fill" />
            </div>
            <h4 className="font-semibold text-lg mb-1">
                Hi {userName}! 👋
            </h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                I&apos;m your Infradyn AI assistant. I can help you check project status,
                track shipments, and answer questions.
            </p>

            {/* Suggestion chips */}
            <div className="grid grid-cols-2 gap-2 w-full">
                {suggestions.map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => onSuggestionClick(suggestion)}
                        className={cn(
                            "text-xs text-left px-3 py-2.5 rounded-xl",
                            "bg-muted/50 hover:bg-muted border border-border/40",
                            "transition-all hover:border-cyan-600/30 hover:shadow-sm",
                            "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
}
