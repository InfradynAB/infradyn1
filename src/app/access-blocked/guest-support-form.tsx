"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaperPlaneTilt, CheckCircle } from "@phosphor-icons/react";

export function GuestSupportForm() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [organizationName, setOrganizationName] = useState("");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [website, setWebsite] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (website) {
            setStatus("done");
            return;
        }
        setStatus("loading");
        setErrorMessage("");
        try {
            // Same-origin proxy avoids browser CORS when the admin app is on another port/domain.
            const res = await fetch("/api/support/guest-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    name: name || undefined,
                    organizationName: organizationName || undefined,
                    subject,
                    description,
                    website: "",
                }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErrorMessage(
                    typeof j?.error === "string"
                        ? j.error
                        : "Could not send message. Try again later or email support."
                );
                setStatus("error");
                return;
            }
            setStatus("done");
        } catch {
            setErrorMessage(
                "Could not submit the form. Try again in a moment, or contact support by email if it continues."
            );
            setStatus("error");
        }
    }

    if (status === "done") {
        return (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/6 px-4 py-4 text-center dark:bg-emerald-500/10 sm:px-5">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-6 w-6" weight="duotone" />
                </div>
                <p className="text-sm font-semibold text-foreground">Message received</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    We&apos;ll email you if we need anything else.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/70 bg-muted/25 p-4 dark:bg-muted/15 sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact support</p>

            <form onSubmit={onSubmit} className="space-y-2.5 text-left">
                <div className="hidden" aria-hidden="true">
                    <Label htmlFor="website-hp">Website</Label>
                    <Input
                        id="website-hp"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                    />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-1 sm:col-span-2">
                        <Label htmlFor="gs-email" className="text-[11px] font-medium">
                            Work email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="gs-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="h-9 rounded-lg border-border/80 bg-background/90 text-sm"
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="gs-name" className="text-[11px] font-medium">
                            Name <span className="font-normal text-muted-foreground">(opt.)</span>
                        </Label>
                        <Input
                            id="gs-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="h-9 rounded-lg border-border/80 bg-background/90 text-sm"
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="gs-org" className="text-[11px] font-medium">
                            Organization <span className="font-normal text-muted-foreground">(opt.)</span>
                        </Label>
                        <Input
                            id="gs-org"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            placeholder="Company"
                            className="h-9 rounded-lg border-border/80 bg-background/90 text-sm"
                        />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                        <Label htmlFor="gs-subject" className="text-[11px] font-medium">
                            Subject <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="gs-subject"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief summary"
                            className="h-9 rounded-lg border-border/80 bg-background/90 text-sm"
                        />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                        <Label htmlFor="gs-desc" className="text-[11px] font-medium">
                            Message <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="gs-desc"
                            required
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What can we help with?"
                            className="min-h-18 resize-y rounded-lg border-border/80 bg-background/90 text-sm"
                        />
                    </div>
                </div>
                {errorMessage && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
                        {errorMessage}
                    </p>
                )}
                <Button
                    type="submit"
                    className="h-9 w-full gap-2 rounded-lg text-sm font-semibold"
                    disabled={status === "loading"}
                >
                    <PaperPlaneTilt className="h-4 w-4" weight="bold" />
                    {status === "loading" ? "Sending…" : "Send message"}
                </Button>
            </form>
        </div>
    );
}
