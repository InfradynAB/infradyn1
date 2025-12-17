import {
    Body,
    Button,
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
                                    {/* Placeholder specific logo representation if image not available */}
                                    <span className="text-white font-bold text-xl tracking-tight">I</span>
                                </div>
                                <span className="text-2xl font-bold tracking-tight text-primary align-middle ml-2">Infradyn</span>
                            </div>
                        </Section>
                        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                            Join <strong>{organizationName}</strong>
                        </Heading>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Hello,
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            <strong>{inviterName}</strong> has invited you to join the <strong>{organizationName}</strong> organization on Infradyn as a <strong>{role}</strong>.
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Infradyn is your all-in-one platform for materials tracking, procurement, and logistics.
                        </Text>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-primary rounded text-white px-5 py-3 text-[14px] font-semibold no-underline text-center"
                                href={inviteLink}
                            >
                                Accept Invitation
                            </Button>
                        </Section>
                        <Text className="text-black text-[14px] leading-[24px]">
                            or copy and paste this URL into your browser:{" "}
                            <Link href={inviteLink} className="text-primary no-underline">
                                {inviteLink}
                            </Link>
                        </Text>
                        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            This invitation was intended for you. If you were not expecting this invitation, you can ignore this email.
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
