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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";

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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="register">Create Account</TabsTrigger>
                <TabsTrigger value="login">Log In</TabsTrigger>
            </TabsList>

            {/* REGISTER TAB */}
            <TabsContent value="register">
                <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                        <div className="space-y-2">
                            <FormLabel>Email</FormLabel>
                            <Input value={email} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">You must use the email you were invited with.</p>
                        </div>
                        <FormField
                            control={signUpForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
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
                                    <FormLabel>Choose Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? (
                                                    <EyeSlash className="h-5 w-5" />
                                                ) : (
                                                    <Eye className="h-5 w-5" />
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
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeSlash className="h-5 w-5" />
                                                ) : (
                                                    <Eye className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account & Accept
                        </Button>
                    </form>
                </Form>
            </TabsContent>

            {/* LOGIN TAB */}
            <TabsContent value="login">
                <Form {...signInForm}>
                    <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                        <div className="space-y-2">
                            <FormLabel>Email</FormLabel>
                            <Input value={email} disabled className="bg-muted" />
                        </div>
                        <FormField
                            control={signInForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showLoginPassword ? "text" : "password"}
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showLoginPassword ? (
                                                    <EyeSlash className="h-5 w-5" />
                                                ) : (
                                                    <Eye className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In & Accept
                        </Button>
                    </form>
                </Form>
            </TabsContent>
        </Tabs>
    );
}
