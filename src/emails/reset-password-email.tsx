import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface ResetPasswordEmailProps {
    resetLink: string;
    userName?: string;
}

export default function ResetPasswordEmail({
    resetLink = "http://localhost:3000/reset-password/confirm?token=xyz",
    userName = "User",
}: ResetPasswordEmailProps) {
    const previewText = "Reset your Infradyn password";

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
                    {/* Main Content Area */}
                    <Container className="max-w-[680px] mx-auto px-[40px] pt-[50px] pb-[40px]">
                        {/* Logo */}
                        <Section className="mb-[40px]">
                            <Text className="text-primary text-[28px] font-bold tracking-tight m-0">
                                Infradyn
                            </Text>
                        </Section>

                        {/* Greeting */}
                        <Heading className="text-navy text-[28px] font-semibold tracking-tight m-0 mb-[24px]">
                            Hello {userName},
                        </Heading>

                        {/* Body Copy */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            We received a request to reset your password for your Infradyn account.
                        </Text>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            If you made this request, you can reset your password by clicking the link below. This link will expire in <strong>1 hour</strong>.
                        </Text>

                        {/* CTA Link - Apple style uses text links */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[40px]">
                            To reset your password,{" "}
                            <Link href={resetLink} className="text-accent underline">
                                click here to continue
                            </Link>.
                        </Text>

                        {/* Divider */}
                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Security Notice */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                        </Text>

                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            If the link above doesn't work, copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-accent text-[12px] leading-[1.5] m-0 break-all">
                            {resetLink}
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
