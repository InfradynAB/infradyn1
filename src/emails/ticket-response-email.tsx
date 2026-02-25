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

export interface TicketResponseEmailProps {
    userName: string;
    ticketNumber: string;
    subject: string;
    responsePreview: string;
    ticketUrl: string;
}

export default function TicketResponseEmail({
    userName = "User",
    ticketNumber = "TKT-00001",
    subject = "Cannot access the dashboard",
    responsePreview = "Thank you for reaching out. We have reviewed your issue and…",
    ticketUrl = "http://localhost:3000/dashboard/support/xxx",
}: TicketResponseEmailProps) {
    const previewText = `Support update on ${ticketNumber}: ${subject}`;

    return (
        <Html>
            <Head>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
            </Head>
            <Preview>{previewText}</Preview>
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

                        <Section className="bg-white rounded-[16px] border border-[#E5E7EB] px-[40px] py-[36px]">
                            {/* Icon */}
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "#F0FDF4",
                                    border: "1px solid #BBF7D0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 24,
                                }}
                            >
                                <span style={{ fontSize: 24 }}>💬</span>
                            </div>

                            <Heading
                                className="text-[22px] font-semibold text-[#111827] mt-0 mb-[6px]"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                Support has responded to your ticket
                            </Heading>
                            <Text className="text-[15px] text-[#6B7280] mt-0 mb-[28px]">
                                Hi {userName}, the support team has replied to your ticket{" "}
                                <strong>{ticketNumber}</strong>.
                            </Text>

                            {/* Ticket + response box */}
                            <div
                                style={{
                                    background: "#F9FAFB",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 12,
                                    padding: "20px 24px",
                                    marginBottom: 28,
                                }}
                            >
                                <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                    Ticket
                                </Text>
                                <Text className="text-[15px] font-semibold text-[#111827] mt-0 mb-[16px]">
                                    {ticketNumber} — {subject}
                                </Text>

                                <Text className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mt-0 mb-[4px]">
                                    Response Preview
                                </Text>
                                <div
                                    style={{
                                        borderLeft: "3px solid #0F6157",
                                        paddingLeft: 16,
                                        margin: "0 0 0 0",
                                    }}
                                >
                                    <Text
                                        className="text-[14px] text-[#374151] mt-0 mb-0"
                                        style={{ fontStyle: "italic" }}
                                    >
                                        &ldquo;{responsePreview}&rdquo;
                                    </Text>
                                </div>
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
                                View Full Response →
                            </Button>
                        </Section>

                        <Hr className="border-[#E5E7EB] mt-[32px] mb-[24px]" />
                        <Text className="text-[12px] text-[#9CA3AF] text-center mt-0 mb-0">
                            Infradyn Materials Platform · Support Notification
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
