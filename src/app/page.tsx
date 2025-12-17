import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-gray-100">
          Infradyn Materials Tracker
        </h1>
        <p className="text-xl text-gray-300 max-w-xl">
          Your single source of truth for project management, from PO to payment.
        </p>
      </div>

      <div className="flex gap-4">
        <Button asChild size="lg" className="text-lg px-8">
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="text-lg px-8">
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </div>

      <div className="mt-8 text-center text-slate-400 text-sm">
        <p>Test the authentication flow:</p>
        <ul className="mt-2 space-y-1">
          <li>• Email/Password Sign Up & Sign In</li>
          <li>• Google OAuth</li>
          <li>• Two-Factor Authentication (2FA with OTP)</li>
        </ul>
      </div>
    </main>
  );
}