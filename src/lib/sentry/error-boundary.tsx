"use client";

import React, { ReactNode, ReactElement } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactElement;
}

export function SentryErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
    return (
        <Sentry.ErrorBoundary
            fallback={
                fallback || (
                    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-4">
                            An unexpected error occurred. Our team has been notified.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Reload Page
                        </button>
                    </div>
                )
            }
        >
            {children}
        </Sentry.ErrorBoundary>
    );
}
