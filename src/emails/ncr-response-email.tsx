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

export interface NCRResponseEmailProps {
    recipientName: string;
    ncrNumber: string;
    ncrTitle?: string;
    severity?: "MINOR" | "MAJOR" | "CRITICAL";
    supplierName: string;
    responsePreview: string;
    hasAttachments?: boolean;
    hasVoiceNote?: boolean;
    projectName?: string;
    poNumber?: string;
    dashboardUrl: string;
}

const severityLabels = {
    MINOR: "Minor",
    MAJOR: "Major",
    CRITICAL: "Critical",
};

export default function NCRResponseEmail({
    recipientName = "Project Manager",
    ncrNumber = "NCR-0001",
    ncrTitle = "Quality Issue - Damaged Materials",
    severity = "MAJOR",
    supplierName = "Acme Supplies",
    responsePreview = "We have reviewed the issue and are preparing a corrective action plan...",
    hasAttachments = false,
    projectName = "Project Alpha",
    poNumber = "PO-2024-001",
    dashboardUrl = "http://localhost:3000/dashboard/ncr/xxx",
}: NCRResponseEmailProps) {
    const previewText = `${supplierName} responded to ${ncrNumber}`;

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

                        {/* Status Header */}
                        <Section className="bg-[#ECFDF5] border border-solid border-[#A7F3D0] rounded-[12px] p-[20px] text-center mb-[24px]">
                            <Text className="text-[#065F46] text-[14px] m-0 font-semibold">
                                ✓ SUPPLIER RESPONDED
                            </Text>
                            <Heading className="text-[#065F46] text-[20px] font-semibold m-0 mt-[8px]">
                                {ncrNumber}
                            </Heading>
                        </Section>

                        {/* Greeting */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Hi {recipientName.split(' ')[0]},
                        </Text>

                        {/* Body */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            <strong>{supplierName}</strong> has responded to the NCR below. Please review their response and take appropriate action.
                        </Text>

                        {/* NCR Details Card */}
                        <Section className="bg-[#f8fafc] border border-solid border-[#e2e8f0] rounded-[12px] p-[24px] my-[24px]">
                            <Text className="text-navy text-[15px] m-0 font-semibold">
                                {ncrTitle}
                            </Text>
                            <Text className="text-muted text-[13px] m-0 mt-[4px]">
                                {severityLabels[severity]} Severity • {projectName} • {poNumber}
                            </Text>
                            <Hr className="border-0 border-t border-solid border-[#e2e8f0] my-[16px]" />
                            
                            {/* Response Preview */}
                            <Text className="text-navy text-[13px] m-0 font-semibold">
                                Supplier's Response:
                            </Text>
                            <Section className="bg-white border border-solid border-[#e2e8f0] rounded-[8px] p-[16px] mt-[8px]">
                                <Text className="text-navy text-[14px] m-0 leading-[1.6]">
                                    "{responsePreview.length > 200 ? responsePreview.slice(0, 200) + '...' : responsePreview}"
                                </Text>
                                {hasAttachments && (
                                    <Text className="text-muted text-[12px] m-0 mt-[8px]">
                                        📎 Includes attachments
                                    </Text>
                                )}
                            </Section>
                        </Section>

                        {/* Action Options */}
                        <Text className="text-navy text-[15px] font-semibold leading-[1.6] m-0 mb-[12px]">
                            Next Steps:
                        </Text>
                        <Section className="pl-[16px] mb-[20px]">
                            <Text className="text-navy text-[14px] leading-[1.8] m-0">
                                • Review the supplier's response and attachments
                            </Text>
                            <Text className="text-navy text-[14px] leading-[1.8] m-0">
                                • Schedule re-inspection if needed
                            </Text>
                            <Text className="text-navy text-[14px] leading-[1.8] m-0">
                                • Close the NCR or request remediation
                            </Text>
                        </Section>

                        {/* CTA Button */}
                        <Section className="text-center my-[32px]">
                            <Button
                                href={dashboardUrl}
                                className="bg-[#0F6157] text-white text-[16px] font-semibold py-[14px] px-[32px] rounded-[8px] no-underline inline-block"
                            >
                                View Full Response
                            </Button>
                        </Section>

                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Footer Note */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            This notification was auto-generated by Infradyn when a supplier responded to an NCR.
                        </Text>

                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            If the button above doesn't work, copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-accent text-[12px] leading-[1.5] m-0 break-all">
                            {dashboardUrl}
                        </Text>
                    </Container>

                    {/* Footer */}
                    <Container className="max-w-[680px] mx-auto bg-[#f5f5f7] px-[40px] py-[24px]">
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 text-center">
                            © 2025 Infradyn. All rights reserved.
                        </Text>
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 text-center">
                            Materials Tracking & Procurement Platform
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
