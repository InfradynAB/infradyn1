"use client";

/**
 * useAIChat — Custom hook for the AI Assistant
 *
 * Manages conversation state, sends messages to the streaming API,
 * parses SSE events, and handles navigation commands.
 */

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { StreamEvent } from "@/lib/ai-assistant/types";

// ============================================================================
// Types
// ============================================================================

export interface ChatMessageUI {
    id: string;
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
    toolActivity?: string; // e.g. "Fetching your notifications..."
}

interface UseAIChatReturn {
    messages: ChatMessageUI[];
    isLoading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    clearMessages: () => void;
}

// ============================================================================
// Tool Name → Human Label
// ============================================================================

const TOOL_LABELS: Record<string, string> = {
    get_my_notifications: "Checking your notifications…",
    get_purchase_orders: "Fetching purchase orders…",
    get_open_ncrs: "Looking up open NCRs…",
    get_active_shipments: "Checking active shipments…",
    get_project_overview: "Analysing project health…",
    get_supplier_performance: "Evaluating supplier performance…",
    get_pending_approvals: "Checking pending approvals…",
    get_my_action_items: "Reviewing your action items…",
    explain_feature: "Looking up feature guide…",
    navigate_to_page: "Preparing navigation…",
};

// ============================================================================
// Hook
// ============================================================================

let messageIdCounter = 0;
function nextId(): string {
    return `msg_${Date.now()}_${++messageIdCounter}`;
}

export function useAIChat(): UseAIChatReturn {
    const [messages, setMessages] = useState<ChatMessageUI[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const router = useRouter();

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        setError(null);

        // Add user message
        const userMsg: ChatMessageUI = {
            id: nextId(),
            role: "user",
            content: content.trim(),
        };

        const assistantId = nextId();
        const assistantMsg: ChatMessageUI = {
            id: assistantId,
            role: "assistant",
            content: "",
            isStreaming: true,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setIsLoading(true);

        // Build the conversation history for the API
        const apiMessages = [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: content.trim() },
        ];

        try {
            abortRef.current = new AbortController();

            const res = await fetch("/api/ai-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `HTTP ${res.status}`);
            }

            if (!res.body) {
                throw new Error("No response body");
            }

            // Parse SSE stream
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete SSE lines
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? ""; // keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;

                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;

                    try {
                        const event: StreamEvent = JSON.parse(jsonStr);
                        handleStreamEvent(event, assistantId, router);
                    } catch {
                        // Ignore malformed SSE lines
                    }
                }
            }

            // Mark streaming as complete
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, isStreaming: false, toolActivity: undefined }
                        : m,
                ),
            );
        } catch (err) {
            if ((err as Error).name === "AbortError") return;

            const errorMsg = err instanceof Error ? err.message : "Something went wrong";
            setError(errorMsg);

            // Update the assistant message with the error
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? {
                            ...m,
                            content: m.content || "Sorry, I encountered an error. Please try again.",
                            isStreaming: false,
                            toolActivity: undefined,
                        }
                        : m,
                ),
            );
        } finally {
            setIsLoading(false);
            abortRef.current = null;
        }
    }, [messages, isLoading, router]);

    // ---- Stream Event Handler ----
    function handleStreamEvent(
        event: StreamEvent,
        assistantId: string,
        routerInstance: ReturnType<typeof useRouter>,
    ) {
        switch (event.type) {
            case "text_delta":
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: m.content + (event.content ?? "") }
                            : m,
                    ),
                );
                break;

            case "tool_start":
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? {
                                ...m,
                                toolActivity:
                                    TOOL_LABELS[event.toolName ?? ""] ?? "Working on it…",
                            }
                            : m,
                    ),
                );
                break;

            case "tool_result":
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, toolActivity: undefined }
                            : m,
                    ),
                );
                break;

            case "error":
                setError(event.content ?? "An error occurred");
                break;

            case "done":
                // Final cleanup handled in the finally block
                break;
        }
    }

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
        abortRef.current?.abort();
    }, []);

    return { messages, isLoading, error, sendMessage, clearMessages };
}
