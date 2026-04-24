import { SignUpForm } from "@/components/auth/sign-up-form";
import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    title: "AI-Powered BOQ Ingestion",
    description: "Upload any document format and let our AI parse line items instantly.",
  },
  {
    title: "Real-Time Logistics Tracking",
    description: "Monitor shipments via Maersk & DHL with live status updates.",
  },
  {
    title: "Enterprise-Grade Compliance",
    description: "Full audit trails, NCR management, and multi-tenant data isolation.",
  },
];

export default function SignUpPage() {
  return (
    <main className="flex h-screen overflow-hidden">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[44%] shrink-0 flex-col justify-between overflow-hidden px-12 py-8">
        <Image
          src="/images/owners.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(11,25,41,0.94) 0%, rgba(11,25,41,0.82) 60%, rgba(14,116,144,0.58) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Image src="/logos/logo.png" alt="Infradyn" width={110} height={36} className="object-contain object-left" />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Infrastructure Procurement Platform
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-[1.18] tracking-tight text-white">
            Intelligence-Powered
            <br />
            <span className="text-cyan-400">Construction</span>
          </h1>
          <p className="mb-8 max-w-xs text-sm leading-relaxed text-slate-300">
            The single source of truth for massive capital projects  from BOQ ingestion to last-mile delivery.
          </p>

          <ul className="space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-500/40">
                  <svg className="h-3 w-3 text-cyan-400" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()} Infradyn. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8] dark:bg-[#0B2A33]">
        {/* Subtle background texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(14,116,144,0.06) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(14,116,144,0.04) 0%, transparent 50%)",
          }}
        />

        <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-6 sm:px-10">
          <div className="w-full max-w-[500px]">

            {/* Mobile logo */}
            <div className="mb-5 lg:hidden">
              <Image src="/logos/logo.png" alt="Infradyn" width={90} height={30} className="object-contain" />
            </div>

            {/* Heading block */}
            <div className="mb-6">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#0E7490]/20 bg-[#0E7490]/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#0E7490] dark:border-[#0E7490]/30 dark:bg-[#0E7490]/10">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0E7490]" />
                Get started for free
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-[#1E293B] dark:text-[#F5F5F5]">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Join infrastructure teams managing capital projects at scale.{" "}
                <Link href="/sign-in" className="font-semibold text-[#0E7490] hover:underline underline-offset-2">
                  Sign in instead
                </Link>
              </p>
            </div>

            {/* Form card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_16px_48px_rgba(0,0,0,0.1)] dark:border-[#1E2D3D] dark:bg-[#152836] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_16px_48px_rgba(0,0,0,0.5)]">
              <div className="px-7 py-6 sm:px-8 sm:py-7">
                <SignUpForm />
              </div>
            </div>

            {/* Legal */}
            <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
              By creating an account you agree to Infradyn&apos;s{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms-of-service" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
