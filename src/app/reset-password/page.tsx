"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleNotch, ArrowLeft, Eye, EyeSlash } from "@phosphor-icons/react";
import Link from "next/link";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const emailSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z.object({
    otp: z.string().min(6, "OTP must be 6 digits"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

// Component for Step 1
function EmailForm({ onSuccess }: { onSuccess: (email: string) => void }) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
    });

    async function onSubmit(values: z.infer<typeof emailSchema>) {
        setIsLoading(true);
        try {
            // @ts-ignore
            const { error } = await authClient.forgetPassword.emailOtp({
                email: values.email,
            });

            if (error) {
                toast.error(error.message || "Failed to send reset code");
            } else {
                toast.success("Reset code sent!");
                onSuccess(values.email);
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Forgot Password</CardTitle>
                <CardDescription>Enter your email to receive a reset code.</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Code
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="justify-center">
                <Button variant="link" asChild className="text-sm text-muted-foreground">
                    <Link href="/sign-in" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Sign In
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

// Component for Step 2
function ResetForm({ email, onBack }: { email: string, onBack: () => void }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof resetSchema>>({
        resolver: zodResolver(resetSchema),
        defaultValues: { otp: "", password: "", confirmPassword: "" },
    });

    async function onSubmit(values: z.infer<typeof resetSchema>) {
        setIsLoading(true);
        try {
            // @ts-ignore
            const { error } = await authClient.emailOtp.resetPassword({
                email: email,
                otp: values.otp,
                password: values.password,
            });

            if (error) {
                toast.error(error.message || "Failed to reset password");
            } else {
                toast.success("Password reset successfully!");
                router.push("/sign-in");
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResend() {
        try {
            // @ts-ignore
            await authClient.forgetPassword.emailOtp({ email });
            toast.info("Code resent!");
        } catch {
            toast.error("Failed to resend");
        }
    }

    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>Enter the code sent to <strong>{email}</strong></CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reset Code</FormLabel>
                                    <FormControl>
                                        <div className="flex justify-center w-full">
                                            <InputOTP
                                                maxLength={6}
                                                {...field}
                                            >
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
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
                                    <FormLabel>New Password</FormLabel>
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
                                                {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type={showConfirmPassword ? "text" : "password"} {...field} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                            Reset Password
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button variant="link" onClick={handleResend} className="text-sm text-muted-foreground p-0 h-auto">
                    Resend Code
                </Button>
                <Button variant="link" onClick={onBack} className="text-sm text-muted-foreground p-0 h-auto">
                    Use different email
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<"email" | "reset">("email");
    const [email, setEmail] = useState("");

    return (
        <div className="flex h-screen w-full items-center justify-center px-4 bg-muted/40">
            {step === "email" ? (
                <EmailForm onSuccess={(e) => { setEmail(e); setStep("reset"); }} />
            ) : (
                <ResetForm email={email} onBack={() => setStep("email")} />
            )}
        </div>
    );
}
