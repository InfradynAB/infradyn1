"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleNotchIcon, GoogleLogoIcon, EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { authClient } from "../../lib/auth-client";
import Link from "next/link";
import { getRoleBasedDashboardRoute } from "@/lib/actions/auth-redirect";

const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
});

const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 characters"),
});

const INPUT_CLS =
    "h-10 rounded-lg border-slate-200 bg-slate-50 text-sm text-[#1E293B] placeholder:text-slate-400 " +
    "focus-visible:border-[#0E7490] focus-visible:ring-2 focus-visible:ring-[#0E7490]/15 focus-visible:bg-white " +
    "dark:border-[#2a3f52] dark:bg-[#1E2D3D] dark:text-[#F5F5F5] dark:placeholder:text-slate-500 " +
    "dark:focus-visible:border-[#0E7490] dark:focus-visible:bg-[#152836] " +
    "transition-all duration-150";

const LABEL_CLS = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

export function SignInForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: { email: "", password: "" },
    });

    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: "" },
    });

    async function redirectToRoleBasedDashboard() {
        try {
            const route = await getRoleBasedDashboardRoute();
            router.push(route);
        } catch {
            router.push("/dashboard");
        }
    }

    async function onSubmit(values: z.infer<typeof signInSchema>) {
        setIsLoading(true);
        await authClient.signIn.email(
            { email: values.email, password: values.password },
            {
                onSuccess: async (ctx) => {
                    if (ctx.data.twoFactorRedirect) {
                        setShowTwoFactor(true);
                        toast.info("Two-factor authentication required.");
                    } else {
                        toast.success("Signed in successfully");
                        await redirectToRoleBasedDashboard();
                    }
                    setIsLoading(false);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Failed to sign in");
                    setIsLoading(false);
                },
            }
        );
    }

    async function onOTPSubmit(values: z.infer<typeof otpSchema>) {
        setIsLoading(true);
        const { error } = await authClient.twoFactor.verifyOtp({
            code: values.otp,
            trustDevice: true,
        });
        if (error) {
            toast.error(error.message || "Invalid OTP");
            setIsLoading(false);
            return;
        }
        toast.success("Two-Factor Authentication verified");
        await redirectToRoleBasedDashboard();
        setIsLoading(false);
    }

    async function handleGoogleSignIn() {
        setIsLoading(true);
        await authClient.signIn.social(
            { provider: "google", callbackURL: "/dashboard" },
            {
                onSuccess: () => {},
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Google sign in failed");
                    setIsLoading(false);
                },
            }
        );
    }

    if (showTwoFactor) {
        return (
            <div className="w-full space-y-5">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Two-Factor Authentication
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Enter the 6-digit code sent to your email.
                    </p>
                </div>
                <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                        <FormField
                            control={otpForm.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className={LABEL_CLS}>OTP Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="123456"
                                            className={INPUT_CLS}
                                            maxLength={6}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            className="h-11 w-full rounded-xl bg-[#0E7490] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#0E7490]/30 hover:bg-[#0c6880] active:bg-[#0a5c70] transition-all duration-150 dark:shadow-[#0E7490]/20"
                            disabled={isLoading}
                        >
                            {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                            Verify Code
                        </Button>
                    </form>
                </Form>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className={LABEL_CLS}>Email Address</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="you@company.com"
                                        autoComplete="email"
                                        className={INPUT_CLS}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px]" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <FormLabel className={LABEL_CLS}>Password</FormLabel>
                                    <Link
                                        href="/reset-password"
                                        className="text-[11px] font-semibold text-[#0E7490] hover:underline underline-offset-2"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            className={INPUT_CLS}
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword
                                                ? <EyeSlashIcon className="h-4 w-4" aria-hidden />
                                                : <EyeIcon className="h-4 w-4" aria-hidden />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px]" />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-[#0E7490] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#0E7490]/30 hover:bg-[#0c6880] active:bg-[#0a5c70] transition-all duration-150 dark:shadow-[#0E7490]/20"
                        disabled={isLoading}
                    >
                        {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100 dark:border-[#2a3f52]" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-300 dark:bg-[#152836] dark:text-slate-600">
                        or
                    </span>
                </div>
            </div>

            <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#0E7490]/30 hover:bg-slate-50 transition-all duration-150 dark:border-[#2a3f52] dark:bg-[#1E2D3D] dark:text-[#F5F5F5] dark:hover:border-[#0E7490]/40 dark:hover:bg-[#243649]"
            >
                <GoogleLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                Continue with Google
            </Button>
        </div>
    );
}
