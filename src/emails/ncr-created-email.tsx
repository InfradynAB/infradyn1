import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

export interface NCRCreatedEmailProps {
    supplierName: string;
    ncrNumber: string;
    ncrTitle: string;
    severity: "MINOR" | "MAJOR" | "CRITICAL";
    issueType: string;
    description?: string;
    poNumber: string;
    projectName: string;
    reportedByName: string;
    slaDueDate: string;
    responseUrl: string;
}

const severityColors = {
    MINOR: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
    MAJOR: { bg: "#FED7AA", border: "#FB923C", text: "#9A3412" },
    CRITICAL: { bg: "#FEE2E2", border: "#F87171", text: "#991B1B" },
};

export default function NCRCreatedEmail({
    supplierName = "Supplier",
    ncrNumber = "NCR-0001",
    ncrTitle = "Quality Issue - Damaged Materials",
    severity = "MAJOR",
    issueType = "DAMAGED",
    description = "Materials received with visible damage",
    poNumber = "PO-2024-001",
    projectName = "Project Alpha",
    reportedByName = "QA Inspector",
    slaDueDate = "Jan 28, 2026",
    responseUrl = "http://localhost:3000/ncr/reply?token=xxx",
}: NCRCreatedEmailProps) {
    const previewText = `[${severity}] NCR ${ncrNumber} Requires Your Response`;
    const colors = severityColors[severity];

    return (
        <Html>
            <Head>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                `}</style>
            </Head>
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                primary: "#0F6157",
                                accent: "#0066CC",
                                navy: "#1d1d1f",
                                muted: "#86868b",
                            },
                        },
                    },
                }}
            >
                <Body className="bg-white my-0 mx-auto font-sans">
                    <Container className="max-w-[680px] mx-auto px-[40px] pt-[50px] pb-[40px]">
                        {/* Logo */}
                        <Section className="mb-[40px]">
                            <Img
                                src="https://materials.infradyn.com/logos/logo.png"
                                width="140"
                                height="auto"
                                alt="Infradyn"
                                className="m-0"
                            />
                        </Section>

                        {/* Severity Alert */}
                        <Section
                            style={{
                                backgroundColor: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: "12px",
                                padding: "20px",
                                textAlign: "center",
                                marginBottom: "24px",
                            }}
                        >
                            <Text style={{ color: colors.text, fontSize: "14px", margin: 0, fontWeight: 600 }}>
                                ⚠️ {severity} NON-CONFORMANCE REPORT
                            </Text>
                            <Heading style={{ color: colors.text, fontSize: "20px", fontWeight: 600, margin: "8px 0 0" }}>
                                {ncrNumber}
                            </Heading>
                        </Section>

                        {/* Greeting */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Hi {supplierName.split(' ')[0]},
                        </Text>

                        {/* Body */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            A non-conformance report has been raised that requires your immediate attention. Please review the details below and provide your response.
                        </Text>

                        {/* NCR Details Card */}
                        <Section className="bg-[#f8fafc] border border-solid border-[#e2e8f0] rounded-[12px] p-[24px] my-[24px]">
                            <Text className="text-navy text-[15px] m-0 font-semibold">
                                {ncrTitle}
                            </Text>
                            <Hr className="border-0 border-t border-solid border-[#e2e8f0] my-[16px]" />
                            <Text className="text-navy text-[14px] m-0 mt-[8px]">
                                <strong>Issue Type:</strong> {issueType.replace(/_/g, ' ')}
                            </Text>
                            <Text className="text-navy text-[14px] m-0 mt-[8px]">
                                <strong>PO Number:</strong> {poNumber}
                            </Text>
                            <Text className="text-navy text-[14px] m-0 mt-[8px]">
                                <strong>Project:</strong> {projectName}
                            </Text>
                            <Text className="text-navy text-[14px] m-0 mt-[8px]">
                                <strong>Reported By:</strong> {reportedByName}
                            </Text>
                            {description && (
                                <>
                                    <Hr className="border-0 border-t border-solid border-[#e2e8f0] my-[16px]" />
                                    <Text className="text-muted text-[14px] m-0 italic">
                                        "{description}"
                                    </Text>
                                </>
                            )}
                        </Section>

                        {/* SLA Notice */}
                        <Section className="bg-[#FFF7ED] border border-solid border-[#FFEDD5] rounded-[12px] p-[16px] my-[24px]">
                            <Text className="text-[#9A3412] text-[14px] m-0 text-center">
                                ⏰ <strong>Response Required By:</strong> {slaDueDate}
                            </Text>
                        </Section>

                        {/* CTA Button */}
                        <Section className="text-center my-8">
                            <Button
                                href={responseUrl}
                                className="bg-[#0F6157] text-white text-[16px] font-semibold py-3.5 px-8 rounded-xl no-underline inline-block"
                            >
                                Respond to NCR
                            </Button>
                        </Section>

                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-8" />

                        {/* Footer Note */}
                        <Text className="text-muted text-[12px] leading-normal m-0 mb-5">
                            Please respond promptly to avoid escalation. If you need more time or information, use the button above to communicate with the project team.
                        </Text>

                        <Text className="text-muted text-[12px] leading-normal m-0">
                            If the button above doesn&apos;t work, copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-accent text-[12px] leading-normal m-0 break-all">
                            {responseUrl}
                        </Text>
                    </Container>

                    {/* Footer */}
                    <Container className="max-w-[680px] mx-auto bg-[#f5f5f7] px-10 py-[24px]">
                        <Text className="text-muted text-[12px] leading-normal m-0 text-center">
                            © 2025 Infradyn. All rights reserved.
                        </Text>
                        <Text className="text-muted text-[12px] leading-normal m-0 text-center">
                            Materials Tracking & Procurement Platform
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
