"use client";

import React from "react";
import { captureException, captureMessage, logger, startSpan } from "@/lib/sentry/utils";

export default function SentryDebugPage() {
    const triggerClientError = () => {
        throw new Error("Sentry Debug: Client-side error triggered");
    };

    const triggerManualReport = () => {
        try {
            // @ts-ignore
            const obj = {};
            // @ts-ignore
            obj.nonExistentMethod();
        } catch (error) {
            captureException(error, {
                context: "Sentry Debug Page",
                userAction: "Clicked manual report button",
            });
            alert("Manual error reported to Sentry!");
        }
    };

    const triggerMessage = () => {
        captureMessage("Sentry Debug: Manual message logged", "info");
        alert("Manual message sent to Sentry!");
    };

    const triggerStructuredLog = () => {
        const userId = "user_debug_123";
        logger.info("Test profile update", { profileId: "pm_456" });
        logger.debug(logger.fmt`Cache simulation for user: ${userId}`);
        alert("Structured logs sent to console (and Sentry via console integration)!");
    };

    const triggerTracingSpan = () => {
        startSpan(
            {
                op: "ui.click",
                name: "Debug Tracing Button Click",
                attributes: {
                    config: "debug_mode",
                    metric: "performance_test"
                }
            },
            (span) => {
                console.log("Trace span started...", span);
                // Simulate some activity
                setTimeout(() => {
                    console.log("Trace span completed.");
                }, 500);
            }
        );
        alert("Tracing span started! Check Sentry Performance tab shortly.");
    };

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const isConfigured = dsn && !dsn.includes("placeholder-dsn");

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Sentry Debug Page</h1>

            <div className={`mb-6 p-4 rounded-lg border ${isConfigured ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                <div className="font-bold flex items-center gap-2">
                    {isConfigured ? '✅ Sentry DSN Loaded' : '⚠️ Sentry DSN Missing/Placeholder'}
                </div>
                <div className="text-sm mt-1">
                    {isConfigured
                        ? `DSN: ${dsn.slice(0, 20)}...${dsn.slice(-10)}`
                        : 'Using placeholder. If you added a DSN to .env.local, RESTART your pnpm dev server.'}
                </div>
            </div>

            <p className="mb-8 text-gray-600">
                Use the buttons below to verify that Sentry is correctly integrated and
                capturing errors.
            </p>

            <div className="grid gap-4">
                <button
                    onClick={triggerClientError}
                    className="p-4 bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 transition text-left"
                >
                    <div className="font-bold">Trigger Client-side Error</div>
                    <div className="text-sm">Throws a raw JS Error (should trigger Error Boundary)</div>
                </button>

                <button
                    onClick={triggerManualReport}
                    className="p-4 bg-orange-100 text-orange-700 border border-orange-300 rounded hover:bg-orange-200 transition text-left"
                >
                    <div className="font-bold">Trigger Manual Exception Report</div>
                    <div className="text-sm">Uses captureException in a try-catch block</div>
                </button>

                <button
                    onClick={triggerMessage}
                    className="p-4 bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200 transition text-left"
                >
                    <div className="font-bold">Log Manual Message</div>
                    <div className="text-sm">Uses captureMessage to log an info event</div>
                </button>

                <button
                    onClick={triggerStructuredLog}
                    className="p-4 bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 transition text-left"
                >
                    <div className="font-bold">Test Structured Logging</div>
                    <div className="text-sm">Uses logger.info and logger.fmt</div>
                </button>

                <button
                    onClick={triggerTracingSpan}
                    className="p-4 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded hover:bg-emerald-200 transition text-left"
                >
                    <div className="font-bold">Test Custom Tracing Span</div>
                    <div className="text-sm">Uses startSpan to measure performance</div>
                </button>
            </div>
        </div>
    );
}
