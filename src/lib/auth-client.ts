"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient, emailOTPClient } from "better-auth/client/plugins";
import { toast } from "sonner";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    fetchOptions: {
        onError(context) {
            const { response } = context;
            if (response?.status === 429) {
                const retryAfter = response.headers.get("X-Retry-After");
                const message = retryAfter
                    ? `Too many requests. Try again in ${retryAfter} seconds.`
                    : "Too many requests. Please try again in a few minutes.";
                toast.error(message, { id: "auth-rate-limit" });
            }
        },
    },
    plugins: [twoFactorClient(), emailOTPClient()],
});
