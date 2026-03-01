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

export interface EscalationEmailProps {
    recipientName: string;
    poNumber: string;
    milestoneTitle: string;
    supplierName: string;
    escalationLevel: number;
    daysOverdue: number;
    dashboardUrl: string;
}

export default function EscalationEmail({
    recipientName = "Manager",
    poNumber = "PO-2024-001",
    milestoneTitle = "Phase 1 Delivery",
    supplierName = "Name",
    escalationLevel = 1,
    daysOverdue = 14,
    dashboardUrl = "http://localhost:3000/dashboard/procurement",
}: EscalationEmailProps) {
    const previewText = `[ESCALATION L${escalationLevel}] ${poNumber} - No Response from ${supplierName}`;

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
                                danger: "#991B1B",
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

                        {/* Alert Header */}
                        <Section className="bg-[#FEF2F2] border border-solid border-[#FEE2E2] rounded-[12px] p-[20px] text-center mb-[24px]">
                            <Text className="text-danger text-[14px] m-0">
                                ⚠️ ESCALATION LEVEL {escalationLevel}
                            </Text>
                            <Heading className="text-danger text-[22px] font-semibold m-0 mt-[8px]">
                                Supplier Not Responding
                            </Heading>
                        </Section>

                        {/* Greeting */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Hi {recipientName.split(' ')[0]},
                        </Text>

                        {/* Body */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            This milestone has been escalated to you due to <strong>{daysOverdue} days</strong> without a supplier update:
                        </Text>

                        {/* Details Card */}
                        <Section className="bg-[#f8fafc] border border-solid border-[#e2e8f0] rounded-[12px] p-[24px] my-[24px]">
                            <Text className="text-navy text-[15px] m-0">
                                <strong>PO Number:</strong> {poNumber}
                            </Text>
                            <Text className="text-navy text-[15px] m-0 mt-[8px]">
                                <strong>Milestone:</strong> {milestoneTitle}
                            </Text>
                            <Text className="text-navy text-[15px] m-0 mt-[8px]">
                                <strong>Supplier:</strong> {supplierName}
                            </Text>
                        </Section>

                        {/* Recommended Actions */}
                        <Text className="text-navy text-[17px] font-semibold leading-[1.6] m-0 mb-[12px]">
                            Recommended Actions:
                        </Text>
                        <Section className="pl-[16px] mb-[20px]">
                            <Text className="text-navy text-[15px] leading-[1.8] m-0">
                                • Contact supplier directly via phone
                            </Text>
                            <Text className="text-navy text-[15px] leading-[1.8] m-0">
                                • Schedule a call to discuss blockers
                            </Text>
                            <Text className="text-navy text-[15px] leading-[1.8] m-0">
                                • Log internal progress estimate if reachable
                            </Text>
                        </Section>

                        {/* CTA Button */}
                        <Section className="text-center my-[32px]">
                            <Button
                                href={dashboardUrl}
                                className="bg-[#0F6157] text-white text-[16px] font-semibold py-[14px] px-[32px] rounded-[8px] no-underline inline-block"
                            >
                                View in Dashboard
                            </Button>
                        </Section>

                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Footer Note */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            This escalation was auto-generated by Infradyn's chase engine. Please take action promptly.
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
