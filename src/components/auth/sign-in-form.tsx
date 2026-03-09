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
import { CircleNotchIcon, GoogleLogoIcon, Eye, EyeSlash } from "@phosphor-icons/react";
import { authClient } from "../../lib/auth-client";
import Link from "next/link";
import { getRoleBasedDashboardRoute } from "@/lib/actions/auth-redirect";

// Schema for Email/Password
const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
});

// Schema for 2FA
const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 characters"),
});

export function SignInForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Email/Password Form
    const form = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // OTP Form
    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            otp: "",
        },
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
            {
                email: values.email,
                password: values.password,
            },
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
        const { data, error } = await authClient.twoFactor.verifyOtp({
            code: values.otp,
            trustDevice: true, // You might want this configurable
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
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard", // Google OAuth will need middleware to handle role-based redirect
        }, {
            onSuccess: () => {
                // Redirect happens automatically
            },
            onError: (ctx) => {
                toast.error(ctx.error.message || "Google sign in failed");
                setIsLoading(false);
            }
        });
    }

    const content = showTwoFactor ? (
        <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-3">
                <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-neutral-800">OTP Code</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="123456"
                                    className="h-10 border-neutral-300 placeholder:text-neutral-400"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button
                    type="submit"
                    className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
                    disabled={isLoading}
                >
                    {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                </Button>
            </form>
        </Form>
    ) : (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium text-neutral-800">Email address</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Provide your email address"
                                        autoComplete="email"
                                        className="h-10 border-neutral-300 placeholder:text-neutral-400"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-xs font-medium text-neutral-800">Password</FormLabel>
                                    <Link
                                        href="/reset-password"
                                        className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            placeholder="Enter your password"
                                            className="h-10 border-neutral-300 placeholder:text-neutral-400"
                                            {...field}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <EyeSlash className="h-4 w-4" aria-hidden="true" />
                                            ) : (
                                                <Eye className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
                        disabled={isLoading}
                    >
                        {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </form>
            </Form>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 font-medium tracking-wide text-neutral-400">OR</span>
                </div>
            </div>

            <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="h-10 w-full border-neutral-300 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
                <GoogleLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                Continue with Google
            </Button>
        </>
    );

    if (showTwoFactor) {
        return (
            <div className="w-full space-y-2">
                <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Two-Factor Authentication</h2>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">
                        Enter the verification code sent to your email.
                    </p>
                </div>
                {content}
            </div>
        );
    }

    return (
        <div className="w-full">{content}</div>
    );
}
