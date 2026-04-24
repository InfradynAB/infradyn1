"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
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
import { CircleNotchIcon, EyeIcon, EyeSlashIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";

const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const INPUT_CLS =
    "h-10 rounded-lg border-slate-200 bg-slate-50 text-sm text-[#1E293B] placeholder:text-slate-400 " +
    "focus-visible:border-[#0E7490] focus-visible:ring-2 focus-visible:ring-[#0E7490]/15 focus-visible:bg-white " +
    "dark:border-[#2a3f52] dark:bg-[#1E2D3D] dark:text-[#F5F5F5] dark:placeholder:text-slate-500 " +
    "dark:focus-visible:border-[#0E7490] dark:focus-visible:bg-[#152836] " +
    "transition-all duration-150";

const LABEL_CLS = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

export function SignUpForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
    });

    async function onSubmit(values: z.infer<typeof signUpSchema>) {
        setIsLoading(true);
        await authClient.signUp.email(
            { email: values.email, password: values.password, name: values.name },
            {
                onSuccess: async () => {
                    try {
                        // @ts-ignore
                        await authClient.emailOtp.sendVerificationOtp({
                            email: values.email,
                            type: "email-verification",
                        });
                        toast.success("Account created! Check your email for a verification code.");
                    } catch (error) {
                        console.error("[SIGN UP] Error sending OTP:", error);
                        toast.error("Account created but failed to send verification email. Use 'Resend Code' on the next page.");
                    }
                    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
                    setIsLoading(false);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Failed to sign up");
                    setIsLoading(false);
                },
            }
        );
    }

    async function handleGoogleContinue() {
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

    return (
        <div className="w-full space-y-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className={LABEL_CLS}>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" autoComplete="name" className={INPUT_CLS} {...field} />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className={LABEL_CLS}>
                                        Phone{" "}
                                        <span className="normal-case font-normal tracking-normal text-slate-400 dark:text-slate-500">
                                            (optional)
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="+1 234 567 8900" autoComplete="tel" className={INPUT_CLS} {...field} />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1.5">
                                <FormLabel className={LABEL_CLS}>Email Address</FormLabel>
                                <FormControl>
                                    <Input placeholder="you@company.com" autoComplete="email" className={INPUT_CLS} {...field} />
                                </FormControl>
                                <FormMessage className="text-[10px]" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className={LABEL_CLS}>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                placeholder="Min. 8 characters"
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
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className={LABEL_CLS}>Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                placeholder="Re-enter password"
                                                className={INPUT_CLS}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword
                                                    ? <EyeSlashIcon className="h-4 w-4" aria-hidden />
                                                    : <EyeIcon className="h-4 w-4" aria-hidden />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <PasswordStrengthIndicator password={form.watch("password")} />

                    <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-[#0E7490] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#0E7490]/30 hover:bg-[#0c6880] active:bg-[#0a5c70] transition-all duration-150 dark:shadow-[#0E7490]/20"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                            : null}
                        Create Account
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
                onClick={handleGoogleContinue}
                disabled={isLoading}
                className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#0E7490]/30 hover:bg-slate-50 transition-all duration-150 dark:border-[#2a3f52] dark:bg-[#1E2D3D] dark:text-[#F5F5F5] dark:hover:border-[#0E7490]/40 dark:hover:bg-[#243649]"
            >
                <GoogleLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                Continue with Google
            </Button>
        </div>
    );
}
