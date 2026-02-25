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
    Row,
    Column,
} from "@react-email/components";
import * as React from "react";

export interface TicketCreatedEmailProps {
    userName: string;
    ticketNumber: string;
    subject: string;
    category: string;
    priority: string;
    ticketUrl: string;
}

const priorityColors: Record<string, { bg: string; border: string; text: string }> = {
    LOW:    { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
    MEDIUM: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" },
    HIGH:   { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
    URGENT: { bg: "#FDF2F8", border: "#E879F9", text: "#701A75" },
};

export default function TicketCreatedEmail({
    userName = "User",
    ticketNumber = "TKT-00001",
    subject = "Cannot access the dashboard",
    category = "Technical Issue",
    priority = "MEDIUM",
    ticketUrl = "http://localhost:3000/dashboard/support/xxx",
}: TicketCreatedEmailProps) {
    const colors = priorityColors[priority] ?? priorityColors.MEDIUM;
    const previewText = `Your support request ${ticketNumber} has been received`;

    return (
        <Html>
            <Head>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
            </Head>
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-[#F9FAFB] my-0 mx-auto font-sans">
                    <Container className="max-w-[640px] mx-auto px-[40px] pt-[48px] pb-[40px]">
                        {/* Logo */}
                        <Section className="mb-[36px]">
                            <Img
                                src="https://materials.infradyn.com/logos/logo.png"
                                width="120"
                                height="28"
                                alt="Infradyn Materials"
                            />
                        </Section>

                        {/* Header */}
                        <Section className="bg-white rounded-[16px] border border-[#E5E7EB] px-[40px] py-[36px] mb-[8px]">
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "#EFF6FF",
                                    border: "1px solid #BFDBFE",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 24,
                                }}
                            >
                                <span style={{ fontSize: 24 }}>🎫</span>
                            </div>

                            <Heading
                                className="text-[22px] font-semibold text-[#111827] mt-0 mb-[8px]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                We&apos;ve received your support request
                            </Heading>
                            <Text className="text-[15px] text-[#6B7280] mt-0 mb-[28px]">
                                Hi {userName}, your ticket has been created and our support team will review it shortly.
                            </Text>

                            {/* Ticket Detail Box */}
                            <div
                                style={{
                                    background: "#F9FAFB",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 12,
                                    padding: "20px 24px",
                                    marginBottom: 28,
                                }}
                            >
                                <Row>
                                    <Column>
                                        <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                            Ticket Number
                                        </Text>
                                        <Text className="text-[15px] font-semibold text-[#111827] mt-0 mb-[16px]">
                                            {ticketNumber}
                                        </Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                            Priority
                                        </Text>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                background: colors.bg,
                                                border: `1px solid ${colors.border}`,
                                                color: colors.text,
                                                borderRadius: 100,
                                                padding: "2px 10px",
                                                fontSize: 12,
                                                fontWeight: 600,
                                                marginBottom: 16,
                                            }}
                                        >
                                            {priority}
                                        </span>
                                    </Column>
                                </Row>
                                <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                    Subject
                                </Text>
                                <Text className="text-[15px] text-[#374151] mt-0 mb-[16px]">{subject}</Text>
                                <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                    Category
                                </Text>
                                <Text className="text-[14px] text-[#374151] mt-0 mb-[0px]">{category}</Text>
                            </div>

                            <Button
                                href={ticketUrl}
                                style={{
                                    background: "#0F6157",
                                    color: "#fff",
                                    borderRadius: 8,
                                    padding: "12px 24px",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    display: "inline-block",
                                }}
                            >
                                View Your Ticket →
                            </Button>
                        </Section>

                        <Section className="bg-white rounded-[16px] border border-[#E5E7EB] px-[40px] py-[24px] mt-[8px]">
                            <Text className="text-[13px] text-[#6B7280] mt-0 mb-[4px]">
                                <strong>What happens next?</strong>
                            </Text>
                            <Text className="text-[13px] text-[#6B7280] mt-0 mb-[4px]">
                                · Our support team will review your request and respond as soon as possible.
                            </Text>
                            <Text className="text-[13px] text-[#6B7280] mt-0 mb-[4px]">
                                · You&apos;ll receive an email notification when there&apos;s an update.
                            </Text>
                            <Text className="text-[13px] text-[#6B7280] mt-0 mb-0">
                                · You can track your ticket status by logging into the platform.
                            </Text>
                        </Section>

                        <Hr className="border-[#E5E7EB] mt-[32px] mb-[24px]" />
                        <Text className="text-[12px] text-[#9CA3AF] text-center mt-0 mb-0">
                            Infradyn Materials Platform · This is an automated notification
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
