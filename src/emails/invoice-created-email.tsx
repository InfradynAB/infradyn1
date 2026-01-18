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

export interface InvoiceCreatedEmailProps {
    recipientName: string;
    supplierName: string;
    poNumber: string;
    invoiceNumber: string;
    amount: string;
    dueDate?: string;
    dashboardUrl: string;
    isSupplier: boolean; // true if recipient is supplier, false if PM
}

export default function InvoiceCreatedEmail({
    recipientName = "User",
    supplierName = "Supplier Co.",
    poNumber = "PO-2024-001",
    invoiceNumber = "INV-001",
    amount = "$10,000.00",
    dueDate,
    dashboardUrl = "http://localhost:3000/dashboard",
    isSupplier = false,
}: InvoiceCreatedEmailProps) {
    const previewText = `Invoice ${invoiceNumber} Created - ${poNumber}`;
    const heading = isSupplier
        ? "Invoice Submitted Successfully"
        : "New Invoice Received";
    const bodyText = isSupplier
        ? "Your invoice has been submitted and is pending review."
        : `${supplierName} has submitted a new invoice for your review.`;

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

                        {/* Status Badge */}
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
                                    backgroundColor: "#0F6157",
                                }}
                            >
                                Invoice Created
                            </span>
                        </Section>

                        {/* Heading */}
                        <Heading className="text-navy text-[28px] font-semibold tracking-tight m-0 mb-[24px] text-center">
                            {heading}
                        </Heading>

                        {/* Greeting */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Hi {recipientName.split(' ')[0]},
                        </Text>

                        {/* Body */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            {bodyText}
                        </Text>

                        {/* Details Card */}
                        <Section className="bg-[#f8fafc] border border-solid border-[#e2e8f0] rounded-[12px] p-[24px] my-[24px]">
                            <Text className="text-navy text-[15px] m-0">
                                <strong>Invoice Number:</strong> {invoiceNumber}
                            </Text>
                            <Text className="text-navy text-[15px] m-0 mt-[8px]">
                                <strong>PO Number:</strong> {poNumber}
                            </Text>
                            <Text className="text-navy text-[15px] m-0 mt-[8px]">
                                <strong>Supplier:</strong> {supplierName}
                            </Text>
                            <Text className="text-navy text-[15px] m-0 mt-[8px]">
                                <strong>Amount:</strong> {amount}
                            </Text>
                            {dueDate && (
                                <Text className="text-navy text-[15px] m-0 mt-[8px]">
                                    <strong>Due Date:</strong> {dueDate}
                                </Text>
                            )}
                        </Section>

                        {/* CTA Button */}
                        <Section className="text-center my-[32px]">
                            <Button
                                href={dashboardUrl}
                                className="bg-[#0F6157] text-white text-[16px] font-semibold py-[14px] px-[32px] rounded-[8px] no-underline inline-block"
                            >
                                {isSupplier ? "View Invoice" : "Review Invoice"}
                            </Button>
                        </Section>

                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Footer Note */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            This is an automated notification from Infradyn.
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
