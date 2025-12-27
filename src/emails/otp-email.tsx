import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
    Hr,
} from "@react-email/components";

interface OtpEmailProps {
    otp: string;
}

export default function OtpEmail({ otp = "123456" }: OtpEmailProps) {
    return (
        <Html>
            <Head>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                `}</style>
            </Head>
            <Preview>Your Verification Code</Preview>
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
                            Verification Code
                        </Heading>

                        {/* Body Copy */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[24px]">
                            Use the following one-time password to complete your sign-in:
                        </Text>

                        {/* OTP Code Display */}
                        <Section className="mb-[32px]">
                            <Text className="text-navy text-[48px] font-bold tracking-[12px] m-0 text-center py-[24px]">
                                {otp}
                            </Text>
                        </Section>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[8px]">
                            This code will expire in <strong>5 minutes</strong>.
                        </Text>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[40px]">
                            If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
                        </Text>

                        {/* Divider */}
                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Security Notice */}
                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            For your security, never share this code with anyone. Infradyn will never ask you for your verification code.
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
