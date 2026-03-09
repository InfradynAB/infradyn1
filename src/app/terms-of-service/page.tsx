import Link from "next/link";

export const metadata = {
    title: "Terms of Service – Infradyn",
    description: "The terms and conditions governing your use of the Infradyn platform.",
};

export default function TermsOfServicePage() {
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
                    Terms of Service
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Effective date: March 10, 2025
                </p>

                <hr className="my-6 border-neutral-100" />

                <Section title="1. Acceptance of Terms">
                    <p>
                        By accessing or using Infradyn, you agree to be bound by these Terms
                        of Service and our Privacy Policy. If you do not agree, you may not
                        use the platform.
                    </p>
                </Section>

                <Section title="2. Eligibility">
                    <p>
                        You must be at least 18 years old and authorized to act on behalf
                        of your organization, if applicable, to use Infradyn. By creating an
                        account, you represent that you meet these requirements.
                    </p>
                </Section>

                <Section title="3. Your Account">
                    <p>
                        You are responsible for maintaining the confidentiality of your
                        account credentials and for all activity that occurs under your
                        account. Notify us immediately of any unauthorized use.
                    </p>
                </Section>

                <Section title="4. Acceptable Use">
                    <p>You agree not to:</p>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>Use the platform for any unlawful or fraudulent purpose.</li>
                        <li>
                            Attempt to gain unauthorized access to any part of the platform.
                        </li>
                        <li>
                            Upload malicious content, malware, or any material that infringes
                            third-party rights.
                        </li>
                        <li>
                            Interfere with or disrupt the integrity or performance of the
                            service.
                        </li>
                    </ul>
                </Section>

                <Section title="5. Intellectual Property">
                    <p>
                        All content, designs, and software comprising Infradyn are owned by
                        or licensed to us. You may not reproduce, distribute, or create
                        derivative works without our prior written consent.
                    </p>
                </Section>

                <Section title="6. Termination">
                    <p>
                        We reserve the right to suspend or terminate your account at our
                        discretion if you breach these Terms or if continued access poses a
                        security or legal risk.
                    </p>
                </Section>

                <Section title="7. Disclaimer of Warranties">
                    <p>
                        The platform is provided "as is" without warranties of any kind,
                        express or implied. We do not warrant that the service will be
                        uninterrupted, error-free, or free of harmful components.
                    </p>
                </Section>

                <Section title="8. Limitation of Liability">
                    <p>
                        To the fullest extent permitted by law, Infradyn shall not be liable
                        for any indirect, incidental, or consequential damages arising from
                        your use of the platform.
                    </p>
                </Section>

                <Section title="9. Changes to Terms">
                    <p>
                        We may modify these Terms from time to time. We will notify you of
                        material changes. Continued use of the platform after changes
                        constitutes acceptance of the revised Terms.
                    </p>
                </Section>

                <Section title="10. Contact Us">
                    <p>
                        For questions about these Terms, contact us at{" "}
                        <a
                            href="mailto:legal@infradyn.com"
                            className="text-[#0E7490] underline-offset-2 hover:underline"
                        >
                            legal@infradyn.com
                        </a>
                        .
                    </p>
                </Section>

                <hr className="my-6 border-neutral-100" />

                <p className="text-[11px] text-neutral-400">
                    See also our{" "}
                    <Link
                        href="/privacy-policy"
                        className="underline underline-offset-2 hover:text-neutral-600"
                    >
                        Privacy Policy
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
