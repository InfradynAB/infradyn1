import * as Sentry from "@sentry/nextjs";

// Guidance: Reference the logger using const { logger } = Sentry
// If the SDK doesn't export a logger with .fmt directly, we provide a structured logger that implements the guidance.
const baseLogger = (Sentry as any).logger || {
    trace: (msg: string, ...args: any[]) => console.trace(`[Sentry Trace] ${msg}`, ...args),
    debug: (msg: string, ...args: any[]) => console.debug(`[Sentry Debug] ${msg}`, ...args),
    info: (msg: string, ...args: any[]) => console.info(`[Sentry Info] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[Sentry Warn] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[Sentry Error] ${msg}`, ...args),
    fatal: (msg: string, ...args: any[]) => console.error(`[Sentry Fatal] ${msg}`, ...args),
};

// Implementation of logger.fmt as a template literal function for structured logs
const loggerFmt = (strings: TemplateStringsArray, ...values: any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
};

export const logger = {
    ...baseLogger,
    fmt: loggerFmt,
};

/**
 * Capture an exception and report it to Sentry manually.
 * Useful for try-catch blocks where you want to handle the error but still report it.
 */
export function captureException(error: unknown, context?: Record<string, any>) {
    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Log a message to Sentry.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
    Sentry.captureMessage(message, level);
}

/**
 * Custom span instrumentation helper for meaningful actions.
 */
export function startSpan<T>(
    options: { op: string; name: string; attributes?: Record<string, any> },
    callback: (span: any) => T | Promise<T>
): T | Promise<T> {
    return Sentry.startSpan(options, (span) => {
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                span.setAttribute(key, value);
            });
        }
        return callback(span);
    });
}

/**
 * Set user context for subsequent Sentry reports.
 */
export function setUserContext(user: { id: string; email?: string | null; name?: string | null }) {
    Sentry.setUser({
        id: user.id,
        email: user.email ?? undefined,
        username: user.name ?? undefined,
    });
}

/**
 * Clear user context (e.g., on logout).
 */
export function clearUserContext() {
    Sentry.setUser(null);
}
