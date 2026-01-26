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
import { toast } from "sonner";
import { CircleNotch, Eye, EyeSlash, UserPlus, SignIn, EnvelopeSimple, Lock, User } from "@phosphor-icons/react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";
import Link from "next/link";

interface InviteAuthFormProps {
    email: string; // Pre-filled and readonly
    onSuccess: () => void;
}

const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const signInSchema = z.object({
    password: z.string().min(1, "Password is required"),
});

export function InviteAuthForm({ email, onSuccess }: InviteAuthFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"register" | "login">("register");

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // --- Sign Up Form ---
    const signUpForm = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", password: "", confirmPassword: "" },
    });

    async function onSignUp(values: z.infer<typeof signUpSchema>) {
        setIsLoading(true);
        await authClient.signUp.email(
            {
                email: email, // Force the invited email
                password: values.password,
                name: values.name,
            },
            {
                onSuccess: () => {
                    toast.success("Account created!");
                    onSuccess(); // Trigger acceptance
                    setIsLoading(false);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Failed to create account");
                    setIsLoading(false);
                },
            }
        );
    }

    // --- Sign In Form ---
    const signInForm = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: { password: "" },
    });

    async function onSignIn(values: z.infer<typeof signInSchema>) {
        setIsLoading(true);
        await authClient.signIn.email(
            {
                email: email, // Force the invited email
                password: values.password,
            },
            {
                onSuccess: () => {
                    toast.success("Signed in!");
                    onSuccess(); // Trigger acceptance
                    setIsLoading(false);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Failed to sign in");
                    setIsLoading(false);
                },
            }
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* Custom Tab Switcher */}
            <div className="flex bg-muted/50 p-1 rounded-xl gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "register"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <UserPlus className="h-4 w-4" weight={activeTab === "register" ? "fill" : "regular"} />
                    Create Account
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        activeTab === "login"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <SignIn className="h-4 w-4" weight={activeTab === "login" ? "fill" : "regular"} />
                    Sign In
                </button>
            </div>

            {/* REGISTER FORM */}
            {activeTab === "register" && (
                <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                        {/* Email - Locked */}
                        <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                            <div className="relative">
                                <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    value={email} 
                                    disabled 
                                    className="bg-muted/50 pl-10 h-11" 
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">This email is linked to your invitation.</p>
                        </div>

                        <FormField
                            control={signUpForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input 
                                                placeholder="John Doe" 
                                                className="pl-10 h-11" 
                                                {...field} 
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={signUpForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Create Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10 h-11"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? (
                                                    <EyeSlash className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <PasswordStrengthIndicator password={field.value} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={signUpForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10 h-11"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeSlash className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" weight="bold" />
                                    Create Account & Join
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            )}

            {/* LOGIN FORM */}
            {activeTab === "login" && (
                <Form {...signInForm}>
                    <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                        {/* Email - Locked */}
                        <div className="space-y-2">
                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                            <div className="relative">
                                <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    value={email} 
                                    disabled 
                                    className="bg-muted/50 pl-10 h-11" 
                                />
                            </div>
                        </div>

                        <FormField
                            control={signInForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Password</FormLabel>
                                        <Link
                                            href="/reset-password"
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <FormControl>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type={showLoginPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="pl-10 pr-10 h-11"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showLoginPassword ? (
                                                    <EyeSlash className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    <SignIn className="mr-2 h-4 w-4" weight="bold" />
                                    Sign In & Join
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            )}
        </div>
    );
}
