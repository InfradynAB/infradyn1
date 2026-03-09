import Link from "next/link";

export const metadata = {
    title: "Privacy Policy – Infradyn",
    description: "How Infradyn collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-[#f5f5f7] px-4 py-10 sm:py-16">
            <article className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_rgba(0,0,0,0.06)] sm:p-10">
                {/* Header */}
                <Link
                    href="/sign-in"
                    className="mb-6 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700"
                >
                    ← Back to sign in
                </Link>

                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                    Privacy Policy
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Effective date: March 10, 2025
                </p>

                <hr className="my-6 border-neutral-100" />

                <Section title="1. Information We Collect">
                    <p>
                        We collect information you provide directly, such as your name,
                        email address, and organization details when you create an account.
                        We also collect usage data and device information automatically as
                        you interact with our platform.
                    </p>
                </Section>

                <Section title="2. How We Use Your Information">
                    <p>We use the information we collect to:</p>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>Provide, maintain, and improve our services.</li>
                        <li>Send account-related communications and notifications.</li>
                        <li>Monitor platform security and prevent fraudulent activity.</li>
                        <li>Generate anonymized analytics to improve the product.</li>
                    </ul>
                </Section>

                <Section title="3. Data Sharing">
                    <p>
                        We do not sell your personal information. We may share data with
                        trusted service providers (e.g., cloud hosting, email delivery) who
                        are bound by confidentiality obligations. We may also disclose
                        information when required by law or to protect our legal rights.
                    </p>
                </Section>

                <Section title="4. Data Retention">
                    <p>
                        We retain your information for as long as your account is active or
                        as needed to provide services. You may request deletion of your data
                        at any time by contacting us.
                    </p>
                </Section>

                <Section title="5. Security">
                    <p>
                        We implement industry-standard security measures including
                        encryption in transit and at rest. No system is entirely secure;
                        however, we take reasonable precautions to protect your information.
                    </p>
                </Section>

                <Section title="6. Your Rights">
                    <p>
                        Depending on your location, you may have rights to access, correct,
                        or delete your personal data. To exercise these rights, contact us
                        at the address below.
                    </p>
                </Section>

                <Section title="7. Contact Us">
                    <p>
                        If you have questions about this Privacy Policy, please email us at{" "}
                        <a
                            href="mailto:privacy@infradyn.com"
                            className="text-[#0E7490] underline-offset-2 hover:underline"
                        >
                            privacy@infradyn.com
                        </a>
                        .
                    </p>
                </Section>

                <hr className="my-6 border-neutral-100" />

                <p className="text-[11px] text-neutral-400">
                    By using Infradyn, you agree to this policy. See also our{" "}
                    <Link
                        href="/terms-of-service"
                        className="underline underline-offset-2 hover:text-neutral-600"
                    >
                        Terms of Service
                    </Link>
                    .
                </p>
            </article>
        </main>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral-800">{title}</h2>
            <div className="text-sm leading-6 text-neutral-600">{children}</div>
        </section>
    );
}
