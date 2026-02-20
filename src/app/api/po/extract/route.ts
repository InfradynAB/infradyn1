import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { extractPOFromS3 } from "@/lib/services/ai-extraction";
import { categorizeBOQItemsWithOptions } from "@/lib/services/boq-categorization";

export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get file URL from request body
        const body = await request.json();
        const { fileUrl } = body;

        if (!fileUrl) {
            return NextResponse.json(
                { error: "fileUrl is required" },
                { status: 400 }
            );
        }

        console.log(`[API] Extracting PO data from: ${fileUrl}`);

        // Run extraction
        const result = await extractPOFromS3(fileUrl);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Extraction failed" },
                { status: 500 }
            );
        }

        const data = result.data;
        if (data?.boqItems?.length) {
            try {
                data.boqItems = await categorizeBOQItemsWithOptions(data.boqItems, { requireAll: true });
            } catch (e) {
                console.warn("[PO Extract] BOQ categorization failed; returning uncategorized BOQ items", e);
            }
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("[API /api/po/extract] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
