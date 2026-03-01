import {
    Body,
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

interface SupplierRemovedEmailProps {
    supplierName: string;
    organizationName: string;
    contactEmail?: string;
}

export default function SupplierRemovedEmail({
    supplierName = "Supplier",
    organizationName = "Organization Name",
    contactEmail,
}: SupplierRemovedEmailProps) {
    const previewText = `Your supplier account with ${organizationName} has been removed`;

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
                                warning: "#f59e0b",
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
                            Hello {supplierName},
                        </Heading>

                        {/* Body Copy */}
                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            We&apos;re writing to inform you that your supplier account with <strong>{organizationName}</strong> has been removed from the Infradyn platform.
                        </Text>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            This means you will no longer have access to:
                        </Text>

                        {/* List of removed access */}
                        <Section className="bg-[#fef3c7] border border-[#f59e0b] rounded-lg p-[20px] mb-[24px]">
                            <Text className="text-[#92400e] text-[15px] leading-[1.6] m-0">
                                • Purchase orders and invoices<br />
                                • Document submissions<br />
                                • Progress updates and milestones<br />
                                • Portal access for this organization
                            </Text>
                        </Section>

                        <Text className="text-navy text-[17px] leading-[1.6] m-0 mb-[20px]">
                            If you believe this was done in error, please contact the organization directly{contactEmail ? ` at ${contactEmail}` : ""}.
                        </Text>

                        {/* Divider */}
                        <Hr className="border-0 border-t border-solid border-[#d2d2d7] my-[32px]" />

                        {/* Support Notice */}
                        <Text className="text-muted text-[14px] leading-[1.5] m-0 mb-[20px]">
                            If you have any questions about this change or need assistance, please reach out to our support team.
                        </Text>

                        <Text className="text-muted text-[12px] leading-[1.5] m-0">
                            Thank you for using Infradyn.
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
