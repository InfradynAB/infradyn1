import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface InvitationEmailProps {
    organizationName: string;
    role: string;
    inviteLink: string;
    inviterName?: string;
}

export default function InvitationEmail({
    organizationName = "Acme Corp",
    role = "member",
    inviteLink = "http://localhost:3000/invite/token",
    inviterName = "Admin",
}: InvitationEmailProps) {
    const previewText = `Join ${organizationName} on Infradyn`;

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
                            <Img
                                src="https://materials.infradyn.com/logos/logo.png"
                                width="140"
                                height="auto"
                                alt="Infradyn"
                                className="m-0"
                            />
                        </Section>

                        {/* Greeting */}
                        <Heading className="text-navy text-[28px] font-semibold tracking-tight m-0 mb-[24px]">
                            Hello {inviterName ? inviterName.split(' ')[0] : 'there'},
                        </Heading>

                        {/* Body Copy */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            You've been invited to join <strong>{organizationName}</strong> on Infradyn as a <strong>{role.replace('_', ' ')}</strong>.
                        </Text>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            Infradyn is your all-in-one platform for materials tracking, procurement, and logistics management. Get started by accepting the invitation below.
                        </Text>

                        {/* CTA Link - Apple style uses text links */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[40px]">
                            To accept this invitation,{" "}
                            <Link href={inviteLink} className="text-accent underline">
                                sign in with your account
                            </Link>.
                        </Text>

                        {/* Divider */}
                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Security Notice */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0 mb-[20px]">
                            This invitation was intended for you. If you were not expecting this invitation, you can safely ignore this email.
                        </Text>

                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            If the link above doesn't work, copy and paste this URL into your browser:
                        </Text>
                        <Text className="text-accent text-[12px] leading-[1.5] m-0 break-all">
                            {inviteLink}
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
