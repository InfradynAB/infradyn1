import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo.config";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: "linear-gradient(145deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 56,
                }}
            >
                <div
                    style={{
                        fontSize: 82,
                        fontWeight: 800,
                        letterSpacing: -2,
                        color: "#f8fafc",
                    }}
                >
                    {siteConfig.name}
                </div>
                <div
                    style={{
                        fontSize: 30,
                        fontWeight: 500,
                        color: "#94a3b8",
                        marginTop: 20,
                        textAlign: "center",
                        maxWidth: 920,
                        lineHeight: 1.35,
                    }}
                >
                    Materials tracking & procurement—from PO to payment
                </div>
                <div
                    style={{
                        marginTop: 36,
                        fontSize: 18,
                        color: "#64748b",
                        letterSpacing: 4,
                        textTransform: "uppercase",
                    }}
                >
                    Procurement · Suppliers · Projects
                </div>
            </div>
        ),
        { ...size }
    );
}
