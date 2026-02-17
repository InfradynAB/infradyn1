/**
 * AI Assistant — Streaming API Route
 *
 * POST /api/ai-assistant
 *
 * Accepts a conversation history, authenticates the user,
 * builds context, calls OpenAI with tools, and streams
 * the response back via SSE.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { getActiveOrganizationId } from "@/lib/utils/org-context";
import { getActiveProjectId } from "@/lib/utils/project-context";
import { resolveUserContext, buildSystemPrompt } from "@/lib/ai-assistant/context";
import { getToolDefinitions, executeTool } from "@/lib/ai-assistant/tools";
import type { ChatMessage, StreamEvent } from "@/lib/ai-assistant/types";

// ============================================================================
// OpenAI Client (singleton, same pattern as ncr-ai-parser.ts)
// ============================================================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// SSE Helpers
// ============================================================================

function encodeSSE(event: StreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
    // ---- Auth ----
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
            { error: "AI Assistant is not configured. Missing OPENAI_API_KEY." },
            { status: 503 },
        );
    }

    // ---- Parse request ----
    let messages: ChatMessage[];
    try {
        const body = await req.json();
        messages = body.messages ?? [];
        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "messages array is required" }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // ---- Build context ----
    const [activeOrgId, activeProjectId] = await Promise.all([
        getActiveOrganizationId(),
        getActiveProjectId(),
    ]);

    const userCtx = await resolveUserContext(
        session.user as {
            id: string;
            name: string;
            email: string;
            role?: string | null;
            organizationId?: string | null;
            supplierId?: string | null;
        },
        activeOrgId,
        activeProjectId,
    );

    const systemPrompt = buildSystemPrompt(userCtx);
    const tools = getToolDefinitions(userCtx);

    // ---- Streaming response ----
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                await runConversation(controller, encoder, systemPrompt, messages, tools, userCtx);
            } catch (err) {
                const errorEvent: StreamEvent = {
                    type: "error",
                    content: err instanceof Error ? err.message : "An unexpected error occurred.",
                };
                controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
            } finally {
                const doneEvent: StreamEvent = { type: "done" };
                controller.enqueue(encoder.encode(encodeSSE(doneEvent)));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

// ============================================================================
// Conversation Loop (handles tool calls iteratively)
// ============================================================================

const MAX_TOOL_ROUNDS = 5; // Safety limit to prevent infinite loops

async function runConversation(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    systemPrompt: string,
    messages: ChatMessage[],
    tools: ReturnType<typeof getToolDefinitions>,
    ctx: import("@/lib/ai-assistant/types").AssistantUserContext,
) {
    // Build the full message array for OpenAI
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
    ];

    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
        round++;

        // Call OpenAI with streaming
        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: openaiMessages,
            tools: tools.map((t) => ({
                type: "function" as const,
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                },
            })),
            tool_choice: "auto",
            stream: true,
            max_tokens: 2048,
        });

        // Accumulate the streamed response
        let fullContent = "";
        const toolCalls: Array<{
            id: string;
            name: string;
            arguments: string;
        }> = [];

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            // Stream text content immediately
            if (delta.content) {
                fullContent += delta.content;
                const textEvent: StreamEvent = {
                    type: "text_delta",
                    content: delta.content,
                };
                controller.enqueue(encoder.encode(encodeSSE(textEvent)));
            }

            // Accumulate tool calls
            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (tc.index !== undefined) {
                        if (!toolCalls[tc.index]) {
                            toolCalls[tc.index] = {
                                id: tc.id ?? "",
                                name: tc.function?.name ?? "",
                                arguments: "",
                            };
                        }
                        if (tc.id) toolCalls[tc.index].id = tc.id;
                        if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
                        if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
                    }
                }
            }
        }

        // If no tool calls, we're done
        if (toolCalls.length === 0) {
            return;
        }

        // Execute tool calls
        openaiMessages.push({
            role: "assistant",
            content: fullContent || null,
            tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.arguments },
            })),
        });

        for (const tc of toolCalls) {
            // Notify frontend about tool execution
            const startEvent: StreamEvent = {
                type: "tool_start",
                toolName: tc.name,
            };
            controller.enqueue(encoder.encode(encodeSSE(startEvent)));

            // Execute the tool
            let args: Record<string, unknown> = {};
            try {
                args = JSON.parse(tc.arguments || "{}");
            } catch {
                args = {};
            }

            const result = await executeTool(tc.name, args, ctx);

            // Send tool result back to OpenAI
            openaiMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result,
            });

            const resultEvent: StreamEvent = {
                type: "tool_result",
                toolName: tc.name,
            };
            controller.enqueue(encoder.encode(encodeSSE(resultEvent)));
        }

        // Loop back so OpenAI can generate a response based on tool results
    }
}
