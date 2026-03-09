import { SignUpForm } from "@/components/auth/sign-up-form";
import Link from "next/link";


export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-4 sm:py-6">
      <section className="mx-auto w-full max-w-[500px] rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_rgba(0,0,0,0.06)] sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Sign up
        </h1>

        <p className="mt-2 text-xs leading-5 text-neutral-600 sm:text-sm">
          Create an account and verify your details to start tracking your projects. Have an account already?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Log in here
          </Link>
        </p>

        <div className="mt-4">
          <SignUpForm />
        </div>

        <p className="mt-4 text-[11px] leading-4 text-neutral-500">
          By signing up you agree to Realize&apos;s{" "}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms-of-service"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            Terms of Service
          </Link>
        </p>
      </section>
    </main>
  );
}
