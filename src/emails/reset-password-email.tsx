import {
    Body,
    Button,
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
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                primary: "#0F6157",
                                accent: "#E14FE3",
                                navy: "#0A1C27",
                            },
                        },
                    },
                }}
            >
                <Body className="bg-gray-100 my-auto mx-auto font-sans text-navy">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px] bg-white">
                        <Section className="mt-[32px] mb-[32px] text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <div className="inline-block bg-primary p-2 rounded-lg">
                                    <span className="text-white font-bold text-xl tracking-tight">I</span>
                                </div>
                                <span className="text-2xl font-bold tracking-tight text-primary align-middle ml-2">Infradyn</span>
                            </div>
                        </Section>
                        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                            Reset your <strong>Password</strong>
                        </Heading>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Hello {userName},
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            We received a request to reset your password for your Infradyn account. If you didn't make this request, you can safely ignore this email.
                        </Text>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-primary rounded text-white px-5 py-3 text-[14px] font-semibold no-underline text-center"
                                href={resetLink}
                            >
                                Reset Password
                            </Button>
                        </Section>
                        <Text className="text-black text-[14px] leading-[24px]">
                            or copy and paste this URL into your browser:{" "}
                            <Link href={resetLink} className="text-primary no-underline">
                                {resetLink}
                            </Link>
                        </Text>
                        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            This link will expire in 1 hour.
                        </Text>
                        <Text className="text-[#666666] text-[12px] leading-[24px] text-center">
                            Powered by <strong>Infradyn Materials Tracker</strong>
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
