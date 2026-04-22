import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import db from "./db/drizzle";
import { render } from "@react-email/render";
import OtpEmail from "./src/emails/otp-email";
import ResetPasswordEmail from "./src/emails/reset-password-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const rateLimitEnabled =
    process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT_IN_DEV === "true";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    advanced: {
        ipAddress: {
            // Cloudflare, then common reverse proxies; first present wins per framework behavior
            ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
            /** Reduce IPv6 address-farm abuse; see Better Auth rate-limit docs for /128 vs subnet. */
            ipv6Subnet: 64,
        },
    },
    rateLimit: {
        enabled: rateLimitEnabled,
        window: 60,
        max: 120,
        storage: "database",
        modelName: "rateLimit",
        customRules: {
            // Session checks should not eat the global budget (polling / layout).
            "/get-session": false,
            "/sign-in/email": { window: 10, max: 5 },
            "/sign-up/email": { window: 60, max: 5 },
            // forgetPassword.emailOtp, emailOtp.resetPassword, sign-up verification sends, etc.
            "/email-otp/*": { window: 60, max: 5 },
        },
    },
    // Note: Do not block session creation here for suspended orgs — Better Auth returns raw JSON
    // on OAuth callback errors. Instead, dashboard layout revokes the session and sends users to
    // /access-blocked with the guest support UI.
    user: {
        additionalFields: {
            organizationId: {
                type: "string"
            },
            role: {
                type: "string"
            },
            supplierId: {
                type: "string"
            }
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 1 week
        updateAge: 60 * 60 * 24, // 1 day
    },
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data: { user: { email: string; name: string }; url: string }) {
            const { user, url } = data;
            const emailHtml = await render(ResetPasswordEmail({
                resetLink: url,
                userName: user.name || "User"
            }));

            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                to: user.email,
                subject: "Reset your Infradyn password",
                html: emailHtml,
            });
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        },
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                try {
                    // Reuse existing OtpEmail template
                    const emailHtml = await render(OtpEmail({ otp }));

                    const result = await resend.emails.send({
                        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                        to: email,
                        subject: "Verify your email address",
                        html: emailHtml,
                    });
                } catch (error) {
                    console.error("[EMAIL OTP] Error sending email:", error);
                    throw error;
                }
            },
        }),
        twoFactor({
            issuer: "Infradyn Materials Tracker",
            otpOptions: {
                async sendOTP({ user, otp }) {
                    const emailHtml = await render(OtpEmail({ otp }));
                    await resend.emails.send({
                        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                        to: user.email,
                        subject: "Your Infradyn Security Code",
                        html: emailHtml,
                    });
                },
            },
        }),
    ],
});
