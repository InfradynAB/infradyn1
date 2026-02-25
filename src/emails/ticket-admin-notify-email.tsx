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

export interface TicketAdminNotifyEmailProps {
    ticketNumber: string;
    subject: string;
    category: string;
    priority: string;
    raisedByName: string;
    raisedByEmail: string;
    description: string;
    ticketUrl: string;
}

const priorityStyles: Record<string, { bg: string; border: string; text: string }> = {
    LOW:    { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
    MEDIUM: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" },
    HIGH:   { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
    URGENT: { bg: "#FDF2F8", border: "#E879F9", text: "#701A75" },
};

export default function TicketAdminNotifyEmail({
    ticketNumber = "TKT-00001",
    subject = "Cannot access the dashboard",
    category = "Technical Issue",
    priority = "HIGH",
    raisedByName = "John Doe",
    raisedByEmail = "john@example.com",
    description = "I am unable to access the procurement dashboard after the latest update…",
    ticketUrl = "http://localhost:3000/dashboard/support/xxx",
}: TicketAdminNotifyEmailProps) {
    const colors = priorityStyles[priority] ?? priorityStyles.MEDIUM;
    const isUrgent = priority === "URGENT" || priority === "HIGH";

    return (
        <Html>
            <Head>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
            </Head>
            <Preview>
                {isUrgent ? `⚠️ [${priority}] ` : ""}New support ticket {ticketNumber}: {subject}
            </Preview>
            <Tailwind>
                <Body className="bg-[#F9FAFB] my-0 mx-auto font-sans">
                    <Container className="max-w-[640px] mx-auto px-[40px] pt-[48px] pb-[40px]">
                        <Section className="mb-[36px]">
                            <Img
                                src="https://materials.infradyn.com/logos/logo.png"
                                width="120"
                                height="28"
                                alt="Infradyn Materials"
                            />
                        </Section>

                        {/* Priority banner for urgent */}
                        {isUrgent && (
                            <Section
                                style={{
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 12,
                                    padding: "12px 20px",
                                    marginBottom: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.text,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        margin: 0,
                                    }}
                                >
                                    ⚡ {priority} PRIORITY — Requires prompt attention
                                </Text>
                            </Section>
                        )}

                        <Section className="bg-white rounded-[16px] border border-[#E5E7EB] px-[40px] py-[36px] mb-[8px]">
                            <Heading
                                className="text-[22px] font-semibold text-[#111827] mt-0 mb-[6px]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                New Support Ticket Raised
                            </Heading>
                            <Text className="text-[14px] text-[#6B7280] mt-0 mb-[28px]">
                                A new support ticket has been submitted and requires your attention.
                            </Text>

                            <div
                                style={{
                                    background: "#F9FAFB",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 12,
                                    padding: "20px 24px",
                                    marginBottom: 24,
                                }}
                            >
                                <Row>
                                    <Column>
                                        <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                            Ticket
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

                                <Row>
                                    <Column>
                                        <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                            Category
                                        </Text>
                                        <Text className="text-[14px] text-[#374151] mt-0 mb-[16px]">{category}</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                            Raised By
                                        </Text>
                                        <Text className="text-[14px] text-[#374151] mt-0 mb-[16px]">
                                            {raisedByName}
                                        </Text>
                                    </Column>
                                </Row>

                                <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                    Description Preview
                                </Text>
                                <Text
                                    className="text-[13px] text-[#6B7280] mt-0 mb-0"
                                    style={{ fontStyle: "italic" }}
                                >
                                    &ldquo;{description}&rdquo;
                                </Text>
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
                                    marginRight: 12,
                                }}
                            >
                                Open Ticket →
                            </Button>
                        </Section>

                        <Hr className="border-[#E5E7EB] mt-[32px] mb-[24px]" />
                        <Text className="text-[12px] text-[#9CA3AF] text-center mt-0 mb-0">
                            Infradyn Materials Platform · Super Admin Notification
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
