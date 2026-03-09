import { SignInForm } from "@/components/auth/sign-in-form";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-4 sm:py-6">
      <section className="mx-auto w-full max-w-[500px] rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_rgba(0,0,0,0.06)] sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Welcome back!
        </h1>

        <p className="mt-2 text-xs leading-5 text-neutral-600 sm:text-sm">
          Sign in to access your dashboard and continue tracking procurement and
          deliveries. Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>

        <div className="mt-4">
          <SignInForm />
        </div>

        <p className="mt-4 text-[11px] leading-4 text-neutral-500">
          By continuing, you agree to our{" "}
          <Link
            href="/terms-of-service"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            terms
          </Link>{" "}
          and acknowledge our{" "}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            privacy policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
