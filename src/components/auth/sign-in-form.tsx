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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>OTP Code</FormLabel>
                            <FormControl>
                                <Input placeholder="123456" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                </Button>
            </form>
        </Form>
    ) : (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your email" autoComplete="email" {...field} />
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
                                    <FormLabel>Password</FormLabel>
                                    <Link
                                        href="/reset-password"
                                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </form>
            </Form>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                </div>
            </div>

            <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading} className="w-full">
                <GoogleLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                Continue with Google
            </Button>

            <p className="pt-2 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="underline underline-offset-4">
                    Sign Up
                </Link>
            </p>
        </>
    );

    if (showTwoFactor) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Enter the code sent to your email.</CardDescription>
                </CardHeader>
                <CardContent>{content}</CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full max-w-md">{content}</div>
    );
}
