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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleNotchIcon, GoogleLogoIcon, Eye, EyeSlash } from "@phosphor-icons/react";
import { authClient } from "../../lib/auth-client";
import Link from "next/link";

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

    async function onSubmit(values: z.infer<typeof signInSchema>) {
        setIsLoading(true);
        await authClient.signIn.email(
            {
                email: values.email,
                password: values.password,
            },
            {
                onSuccess: (ctx) => {
                    if (ctx.data.twoFactorRedirect) {
                        setShowTwoFactor(true);
                        toast.info("Two-factor authentication required.");
                    } else {
                        router.push("/dashboard");
                        toast.success("Signed in successfully");
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
        router.push("/dashboard");
        setIsLoading(false);
    }

    async function handleGoogleSignIn() {
        setIsLoading(true);
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard",
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

    if (showTwoFactor) {
        return (
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>Enter the code sent to your email.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                    Enter your email below to sign in to your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading}>
                        <GoogleLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                        Google
                    </Button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m@example.com" {...field} />
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
                                                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                            >
                                                Forgot your password?
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? "text" : "password"} {...field} />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeSlash className="h-4 w-4" aria-hidden="true" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" aria-hidden="true" />
                                                    )}
                                                    <span className="sr-only">
                                                        {showPassword ? "Hide password" : "Show password"}
                                                    </span>
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
                </div>
            </CardContent>
            <CardFooter className="justify-center">
                <p className="text-sm text-muted-foreground">Don&apos;t have an account? <a href="/sign-up" className="underline">Sign up</a></p>
            </CardFooter>
        </Card>
    );
}
