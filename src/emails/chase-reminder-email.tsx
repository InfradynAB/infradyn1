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

export interface ChaseReminderEmailProps {
    supplierName: string;
    poNumber: string;
    milestoneTitle: string;
    daysOverdue: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    updateUrl: string;
}

export default function ChaseReminderEmail({
    supplierName = "Supplier",
    poNumber = "PO-2024-001",
    milestoneTitle = "Phase 1 Delivery",
    daysOverdue = 7,
    riskLevel = "MEDIUM",
    updateUrl = "http://localhost:3000/dashboard/supplier",
}: ChaseReminderEmailProps) {
    const urgencyText = riskLevel === "HIGH" ? "URGENT" :
        riskLevel === "MEDIUM" ? "Action Needed" : "Reminder";
    const urgencyColor = riskLevel === "HIGH" ? "#EF4444" :
        riskLevel === "MEDIUM" ? "#F59E0B" : "#6B7280";
    const previewText = `[${urgencyText}] Progress Update Required - ${poNumber}`;

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

                        {/* Urgency Badge */}
                        <Section className="text-center mb-[24px]">
                            <span
                                style={{
                                    display: "inline-block",
                                    padding: "6px 16px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    color: "white",
                                    backgroundColor: urgencyColor,
                                }}
                            >
                                {urgencyText}
                            </span>
                        </Section>

                        {/* Heading */}
                        <Heading className="text-navy text-[28px] font-semibold tracking-tight m-0 mb-[24px] text-center">
                            Progress Update Required
                        </Heading>

                        {/* Greeting */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Hi {supplierName.split(' ')[0]},
                        </Text>

                        {/* Body */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            We haven't received a progress update for the following milestone:
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
                                <strong>Days without update:</strong> {daysOverdue}
                            </Text>
                        </Section>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Please submit your progress update at your earliest convenience to keep the project on track.
                        </Text>

                        {/* CTA Button */}
                        <Section className="text-center my-[32px]">
                            <Button
                                href={updateUrl}
                                className="bg-[#0F6157] text-white text-[16px] font-semibold py-[14px] px-[32px] rounded-[8px] no-underline inline-block"
                            >
                                Update Progress Now
                            </Button>
                        </Section>

                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Footer Note */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            This is an automated reminder from Infradyn. If you've already submitted an update, please disregard this email.
                        </Text>

                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            If the button above doesn't work, copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-accent text-[12px] leading-[1.5] m-0 break-all">
                            {updateUrl}
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
