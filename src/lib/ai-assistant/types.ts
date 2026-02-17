/**
 * AI Assistant — Shared Types
 *
 * Centralised type definitions used across the context engine,
 * tool system, API route, and frontend hook.
 */

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
    role: MessageRole;
    content: string;
}

// ============================================================================
// User Context (derived from the session on each request)
// ============================================================================

export interface AssistantUserContext {
    userId: string;
    name: string;
    email: string;
    role: string; // "PM" | "SUPPLIER" | "ADMIN" etc.
    organizationId: string | null;
    organizationName: string | null;
    activeProjectId: string | null;
    activeProjectName: string | null;
    supplierId: string | null; // Only for suppliers
}

// ============================================================================
// Tool Execution
// ============================================================================

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

export interface ToolCallResult {
    toolName: string;
    result: string; // JSON-stringified result sent back to the model
}

// ============================================================================
// Streaming Event Types (sent from API → frontend via SSE)
// ============================================================================

export type StreamEventType =
    | "text_delta"     // Incremental text chunk
    | "tool_start"     // Tool call started (show loading indicator)
    | "tool_result"    // Tool call finished
    | "done"           // Stream complete
    | "error";         // Error occurred

export interface StreamEvent {
    type: StreamEventType;
    content?: string;
    toolName?: string;
}
