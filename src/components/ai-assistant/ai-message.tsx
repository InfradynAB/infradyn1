"use client";

/**
 * AIMessage — Single message bubble for the AI chat.
 *
 * Supports:
 *  - User messages (right-aligned, accent)
 *  - Assistant messages (left-aligned, with markdown)
 *  - Tool activity indicator (pulsing animation)
 *  - Streaming cursor
 */

import { memo } from "react";
import { Robot, User, SpinnerGap } from "@phosphor-icons/react";
import type { ChatMessageUI } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

// ============================================================================
// Simple markdown → HTML renderer (no heavy deps)
// ============================================================================

function renderMarkdown(text: string): string {
    return text
        // Code blocks (```...```)
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="ai-code-block"><code>$2</code></pre>')
        // Inline code (`...`)
        .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
        // Bold (**...**)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        // Italic (*...*)
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
        // Bullet lists (- item)
        .replace(/^[-•]\s+(.+)$/gm, '<li class="ai-list-item">$1</li>')
        // Numbered lists (1. item)
        .replace(/^\d+\.\s+(.+)$/gm, '<li class="ai-list-item">$1</li>')
        // Newlines
        .replace(/\n/g, "<br />");
}

// ============================================================================
// Component
// ============================================================================

interface AIMessageProps {
    message: ChatMessageUI;
}

export const AIMessage = memo(function AIMessage({ message }: AIMessageProps) {
    const isUser = message.role === "user";
    const isAssistant = message.role === "assistant";

    return (
        <div
            className={cn(
                "flex gap-2.5 w-full",
                isUser ? "flex-row-reverse" : "flex-row",
            )}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                    isUser
                        ? "bg-cyan-700 text-white"
                        : "bg-gradient-to-br from-cyan-700 to-cyan-600 text-white",
                )}
            >
                {isUser ? (
                    <User className="w-3.5 h-3.5" weight="fill" />
                ) : (
                    <Robot className="w-3.5 h-3.5" weight="fill" />
                )}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    isUser
                        ? "bg-cyan-700 text-white rounded-br-md"
                        : "bg-muted/60 text-foreground rounded-bl-md border border-border/40",
                )}
            >
                {/* Tool activity indicator */}
                {message.toolActivity && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 animate-pulse">
                        <SpinnerGap className="w-3 h-3 animate-spin" />
                        <span>{message.toolActivity}</span>
                    </div>
                )}

                {/* Message content */}
                {isAssistant && message.content ? (
                    <div
                        className="ai-message-content prose prose-sm dark:prose-invert max-w-none [&_pre]:my-2 [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:bg-background/80 [&_code]:text-xs [&_li]:ml-4 [&_li]:list-disc"
                        dangerouslySetInnerHTML={{
                            __html: renderMarkdown(message.content),
                        }}
                    />
                ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                )}

                {/* Streaming cursor */}
                {message.isStreaming && !message.content && !message.toolActivity && (
                    <div className="flex items-center gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                    </div>
                )}
            </div>
        </div>
    );
});
