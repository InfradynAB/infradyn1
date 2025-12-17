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
            <Head />
            <Preview>Your Verification Code</Preview>
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
                                <span className="text-2xl font-bold tracking-tight text-primary align-middle">Infradyn Security</span>
                            </div>
                        </Section>
                        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                            Verification Code
                        </Heading>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Use the following one-time password (OTP) to complete your login or action:
                        </Text>
                        <Section className="bg-gray-50 border border-gray-200 rounded-lg p-[20px] my-[20px] text-center">
                            <Text className="text-black text-[32px] font-bold tracking-[8px] m-0">
                                {otp}
                            </Text>
                        </Section>
                        <Text className="text-black text-[14px] leading-[24px]">
                            This code will expire in 5 minutes. Do not share this code with anyone.
                        </Text>
                        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                        <Text className="text-[#666666] text-[12px] leading-[24px] text-center">
                            Sent by Infradyn Materials Tracker
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
