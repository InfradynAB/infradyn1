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
import { CircleNotch, Eye, EyeSlash, GoogleLogoIcon } from "@phosphor-icons/react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";

const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export function SignUpForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof signUpSchema>) {
        setIsLoading(true);
        await authClient.signUp.email(
            {
                email: values.email,
                password: values.password,
                name: values.name,
                // image: undefined, // Optional
            },
            {
                onSuccess: async () => {
                    try {
                        // @ts-ignore - The method exists but types may not reflect it
                        await authClient.emailOtp.sendVerificationOtp({
                            email: values.email,
                            type: "email-verification",
                        });
                        toast.success("Account created! Check your email for verification code.");
                    } catch (error) {
                        console.error("[SIGN UP] Error sending OTP:", error);
                        toast.error("Account created but failed to send verification email. Please use 'Resend Code' on the next page.");
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
            {
                provider: "google",
                callbackURL: "/dashboard",
            },
            {
                onSuccess: () => {
                    // Redirect handled by auth client
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Google sign in failed");
                    setIsLoading(false);
                },
            }
        );
    }

    return (
        <div className="w-full">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium text-neutral-800">Full Name</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter your name"
                                        autoComplete="name"
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
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium text-neutral-800">Phone (Optional)</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="+1234567890"
                                        autoComplete="tel"
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
                                <FormLabel className="text-xs font-medium text-neutral-800">Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Create a password"
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
                                <PasswordStrengthIndicator password={field.value} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium text-neutral-800">Confirm Password</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Confirm your password"
                                            className="h-10 border-neutral-300 placeholder:text-neutral-400"
                                            {...field}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? (
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
                        {isLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                        Sign Up
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
                onClick={handleGoogleContinue}
                disabled={isLoading}
                className="h-10 w-full border-neutral-300 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
                <GoogleLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                Continue with Google
            </Button>
        </div>
    );
}
