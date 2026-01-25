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

export interface NCRCommentEmailProps {
    recipientName: string;
    ncrNumber: string;
    ncrTitle: string;
    severity: "MINOR" | "MAJOR" | "CRITICAL";
    commenterName: string;
    commenterRole: string;
    commentPreview: string;
    hasAttachments: boolean;
    hasVoiceNote: boolean;
    projectName: string;
    responseUrl: string;
    isSupplierRecipient: boolean; // To customize the CTA
}

export default function NCRCommentEmail({
    recipientName = "Team Member",
    ncrNumber = "NCR-0001",
    ncrTitle = "Quality Issue - Damaged Materials",
    severity = "MAJOR",
    commenterName = "John Smith",
    commenterRole = "QA Inspector",
    commentPreview = "Please provide additional photos of the affected items...",
    hasAttachments = false,
    hasVoiceNote = false,
    projectName = "Project Alpha",
    responseUrl = "http://localhost:3000/ncr/reply?token=xxx",
    isSupplierRecipient = true,
}: NCRCommentEmailProps) {
    const previewText = `New message on ${ncrNumber} from ${commenterName}`;

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

                        {/* Message Header */}
                        <Section className="bg-[#EFF6FF] border border-solid border-[#BFDBFE] rounded-[12px] p-[20px] text-center mb-[24px]">
                            <Text className="text-[#1E40AF] text-[14px] m-0 font-semibold">
                                💬 NEW MESSAGE
                            </Text>
                            <Heading className="text-[#1E40AF] text-[20px] font-semibold m-0 mt-[8px]">
                                {ncrNumber}
                            </Heading>
                        </Section>

                        {/* Greeting */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Hi {recipientName.split(' ')[0]},
                        </Text>

                        {/* Body */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            <strong>{commenterName}</strong> ({commenterRole}) has added a new message to the NCR conversation.
                        </Text>

                        {/* NCR Context */}
                        <Section className="bg-[#f8fafc] border border-solid border-[#e2e8f0] rounded-[12px] p-[24px] my-[24px]">
                            <Text className="text-muted text-[13px] m-0 mb-[8px]">
                                {projectName} • {severity} Severity
                            </Text>
                            <Text className="text-navy text-[15px] m-0 font-semibold">
                                {ncrTitle}
                            </Text>
                            <Hr className="border-0 border-t border-solid border-[#e2e8f0] my-[16px]" />
                            
                            {/* Comment Preview */}
                            <Section className="bg-white border-l-4 border-solid border-[#0F6157] pl-[16px] py-[12px]">
                                <Text className="text-navy text-[14px] m-0 leading-[1.6]">
                                    "{commentPreview.length > 250 ? commentPreview.slice(0, 250) + '...' : commentPreview}"
                                </Text>
                                <Section className="mt-[8px]">
                                    {hasAttachments && (
                                        <Text className="text-muted text-[12px] m-0 inline-block mr-[12px]">
                                            📎 Attachments included
                                        </Text>
                                    )}
                                    {hasVoiceNote && (
                                        <Text className="text-muted text-[12px] m-0 inline-block">
                                            🎤 Voice note included
                                        </Text>
                                    )}
                                </Section>
                            </Section>
                        </Section>

                        {/* CTA Button */}
                        <Section className="text-center my-[32px]">
                            <Button
                                href={responseUrl}
                                className="bg-[#0F6157] text-white text-[16px] font-semibold py-[14px] px-[32px] rounded-[8px] no-underline inline-block"
                            >
                                {isSupplierRecipient ? "View & Reply" : "View Conversation"}
                            </Button>
                        </Section>

                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Footer Note */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            You're receiving this because you're part of the NCR conversation. Reply directly to keep the discussion going.
                        </Text>

                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            If the button above doesn't work, copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-accent text-[12px] leading-[1.5] m-0 break-all">
                            {responseUrl}
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
