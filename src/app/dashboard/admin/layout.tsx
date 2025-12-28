import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        redirect("/sign-in");
    }

    // Only ADMIN role can access admin dashboard
    if (session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
