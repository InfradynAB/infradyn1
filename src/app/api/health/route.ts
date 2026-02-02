import { NextResponse } from "next/server";
import db, { pool } from "@/db/drizzle";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ServiceHealth {
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime?: number;
    message?: string;
    lastChecked: string;
    category: "database" | "storage" | "external" | "internal" | "email" | "api";
}

interface HealthResponse {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: ServiceHealth[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
}

// Track server start time for uptime
const startTime = Date.now();

async function checkDatabase(): Promise<ServiceHealth> {
    const start = performance.now();
    try {
        await db.execute(sql`SELECT 1`);
        const responseTime = Math.round(performance.now() - start);
        return {
            name: "PostgreSQL Database",
            status: responseTime > 1000 ? "degraded" : "healthy",
            responseTime,
            message: responseTime > 1000 ? "Slow response time" : "Connection successful",
            lastChecked: new Date().toISOString(),
            category: "database",
        };
    } catch (error) {
        return {
            name: "PostgreSQL Database",
            status: "unhealthy",
            responseTime: Math.round(performance.now() - start),
            message: error instanceof Error ? error.message : "Connection failed",
            lastChecked: new Date().toISOString(),
            category: "database",
        };
    }
}

async function checkDatabasePool(): Promise<ServiceHealth> {
    try {
        const totalCount = pool.totalCount;
        const idleCount = pool.idleCount;
        const waitingCount = pool.waitingCount;
        
        const utilizationPercent = totalCount > 0 ? ((totalCount - idleCount) / totalCount) * 100 : 0;
        
        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        let message = `Active: ${totalCount - idleCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`;
        
        if (waitingCount > 0) {
            status = "degraded";
            message = `Pool under pressure - ${waitingCount} waiting connections`;
        }
        if (utilizationPercent > 90) {
            status = "degraded";
            message = `High pool utilization: ${utilizationPercent.toFixed(1)}%`;
        }
        
        return {
            name: "Database Connection Pool",
            status,
            message,
            lastChecked: new Date().toISOString(),
            category: "database",
        };
    } catch (error) {
        return {
            name: "Database Connection Pool",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Failed to check pool",
            lastChecked: new Date().toISOString(),
            category: "database",
        };
    }
}

async function checkS3Storage(): Promise<ServiceHealth> {
    const start = performance.now();
    try {
        // Check if S3 env vars are configured
        const bucket = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_REGION;
        
        if (!bucket || !region) {
            return {
                name: "AWS S3 Storage",
                status: "unhealthy",
                message: "S3 not configured (missing environment variables)",
                lastChecked: new Date().toISOString(),
                category: "storage",
            };
        }
        
        // Try a HEAD request to check bucket accessibility
        const response = await fetch(`https://${bucket}.s3.${region}.amazonaws.com`, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000),
        }).catch(() => null);
        
        const responseTime = Math.round(performance.now() - start);
        
        if (response) {
            return {
                name: "AWS S3 Storage",
                status: responseTime > 2000 ? "degraded" : "healthy",
                responseTime,
                message: "Bucket accessible",
                lastChecked: new Date().toISOString(),
                category: "storage",
            };
        }
        
        // S3 might return 403 for HEAD without auth, but that means it's reachable
        return {
            name: "AWS S3 Storage",
            status: "healthy",
            responseTime,
            message: "S3 endpoint reachable",
            lastChecked: new Date().toISOString(),
            category: "storage",
        };
    } catch (error) {
        return {
            name: "AWS S3 Storage",
            status: "degraded",
            responseTime: Math.round(performance.now() - start),
            message: "Could not verify S3 - may still be operational",
            lastChecked: new Date().toISOString(),
            category: "storage",
        };
    }
}

async function checkResend(): Promise<ServiceHealth> {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        
        if (!apiKey) {
            return {
                name: "Resend Email Service",
                status: "unhealthy",
                message: "API key not configured",
                lastChecked: new Date().toISOString(),
                category: "email",
            };
        }
        
        return {
            name: "Resend Email Service",
            status: "healthy",
            message: "API key configured",
            lastChecked: new Date().toISOString(),
            category: "email",
        };
    } catch (error) {
        return {
            name: "Resend Email Service",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "email",
        };
    }
}

async function checkSmartsheet(): Promise<ServiceHealth> {
    try {
        const apiKey = process.env.SMARTSHEET_API_KEY;
        
        if (!apiKey) {
            return {
                name: "Smartsheet Integration",
                status: "degraded",
                message: "Not configured (optional)",
                lastChecked: new Date().toISOString(),
                category: "external",
            };
        }
        
        return {
            name: "Smartsheet Integration",
            status: "healthy",
            message: "API key configured",
            lastChecked: new Date().toISOString(),
            category: "external",
        };
    } catch (error) {
        return {
            name: "Smartsheet Integration",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "external",
        };
    }
}

async function checkGoogleSheets(): Promise<ServiceHealth> {
    try {
        const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        
        if (!credentials) {
            return {
                name: "Google Sheets Integration",
                status: "degraded",
                message: "Not configured (optional)",
                lastChecked: new Date().toISOString(),
                category: "external",
            };
        }
        
        return {
            name: "Google Sheets Integration",
            status: "healthy",
            message: "Service account configured",
            lastChecked: new Date().toISOString(),
            category: "external",
        };
    } catch (error) {
        return {
            name: "Google Sheets Integration",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "external",
        };
    }
}

async function checkOpenAI(): Promise<ServiceHealth> {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            return {
                name: "OpenAI Service",
                status: "degraded",
                message: "Not configured (AI features disabled)",
                lastChecked: new Date().toISOString(),
                category: "external",
            };
        }
        
        return {
            name: "OpenAI Service",
            status: "healthy",
            message: "API key configured",
            lastChecked: new Date().toISOString(),
            category: "external",
        };
    } catch (error) {
        return {
            name: "OpenAI Service",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "external",
        };
    }
}

async function checkAuthService(): Promise<ServiceHealth> {
    try {
        const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
        
        if (!betterAuthSecret) {
            return {
                name: "Authentication Service",
                status: "unhealthy",
                message: "Auth secret not configured",
                lastChecked: new Date().toISOString(),
                category: "internal",
            };
        }
        
        return {
            name: "Authentication Service",
            status: "healthy",
            message: "Auth configured correctly",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    } catch (error) {
        return {
            name: "Authentication Service",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    }
}

async function checkCronJobs(): Promise<ServiceHealth> {
    try {
        const cronSecret = process.env.CRON_SECRET;
        
        if (!cronSecret) {
            return {
                name: "Scheduled Jobs (Cron)",
                status: "degraded",
                message: "Cron secret not configured",
                lastChecked: new Date().toISOString(),
                category: "internal",
            };
        }
        
        return {
            name: "Scheduled Jobs (Cron)",
            status: "healthy",
            message: "Cron jobs configured",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    } catch (error) {
        return {
            name: "Scheduled Jobs (Cron)",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    }
}

async function checkNextAuth(): Promise<ServiceHealth> {
    try {
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        if (!googleClientId || !googleClientSecret) {
            return {
                name: "OAuth Providers",
                status: "degraded",
                message: "Google OAuth not configured",
                lastChecked: new Date().toISOString(),
                category: "internal",
            };
        }
        
        return {
            name: "OAuth Providers",
            status: "healthy",
            message: "Google OAuth configured",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    } catch (error) {
        return {
            name: "OAuth Providers",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    }
}

async function checkMemory(): Promise<ServiceHealth> {
    try {
        const used = process.memoryUsage();
        const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
        const usagePercent = (used.heapUsed / used.heapTotal) * 100;
        
        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        if (usagePercent > 85) status = "degraded";
        if (usagePercent > 95) status = "unhealthy";
        
        return {
            name: "Memory Usage",
            status,
            message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    } catch (error) {
        return {
            name: "Memory Usage",
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Check failed",
            lastChecked: new Date().toISOString(),
            category: "internal",
        };
    }
}

export async function GET() {
    const timestamp = new Date().toISOString();
    
    // Run all health checks in parallel
    const services = await Promise.all([
        checkDatabase(),
        checkDatabasePool(),
        checkS3Storage(),
        checkResend(),
        checkAuthService(),
        checkCronJobs(),
        checkNextAuth(),
        checkOpenAI(),
        checkSmartsheet(),
        checkGoogleSheets(),
        checkMemory(),
    ]);
    
    // Calculate summary
    const summary = {
        total: services.length,
        healthy: services.filter(s => s.status === "healthy").length,
        degraded: services.filter(s => s.status === "degraded").length,
        unhealthy: services.filter(s => s.status === "unhealthy").length,
    };
    
    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (summary.unhealthy > 0) {
        // Critical services that make the whole system unhealthy
        const criticalUnhealthy = services.filter(
            s => s.status === "unhealthy" && 
            (s.name === "PostgreSQL Database" || s.name === "Authentication Service")
        );
        if (criticalUnhealthy.length > 0) {
            overallStatus = "unhealthy";
        } else {
            overallStatus = "degraded";
        }
    } else if (summary.degraded > 0) {
        overallStatus = "degraded";
    }
    
    const response: HealthResponse = {
        status: overallStatus,
        timestamp,
        uptime: Math.round((Date.now() - startTime) / 1000),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        services,
        summary,
    };
    
    // Return appropriate status code based on health
    const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;
    
    return NextResponse.json(response, { 
        status: statusCode,
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
        },
    });
}
