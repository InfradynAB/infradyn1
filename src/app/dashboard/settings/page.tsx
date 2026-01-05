import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, UserCircleIcon, BellIcon, ShieldCheckIcon, PaletteIcon, BuildingsIcon, PlugsConnectedIcon, FileCloudIcon } from "@phosphor-icons/react/dist/ssr";

const settingsLinks = [
    {
        title: "Organization",
        description: "Update organization details, branding, and policies.",
        href: "/dashboard/settings/organization",
        icon: BuildingsIcon,
    },
    {
        title: "Team",
        description: "Manage team members and invitations.",
        href: "/dashboard/settings/team",
        icon: UsersIcon,
    },
    {
        title: "Integrations",
        description: "Connect Smartsheet, manage email ingestion, and view usage.",
        href: "/dashboard/settings/integrations",
        icon: PlugsConnectedIcon,
    },
    {
        title: "Profile",
        description: "Update your personal information and preferences.",
        href: "/dashboard/settings/profile",
        icon: UserCircleIcon,
    },
    {
        title: "Notifications",
        description: "Configure how you receive alerts and updates.",
        href: "/dashboard/settings/notifications",
        icon: BellIcon,
    },
    {
        title: "Security",
        description: "Manage passwords, 2FA, and active sessions.",
        href: "/dashboard/settings/security",
        icon: ShieldCheckIcon,
    },
    {
        title: "Appearance",
        description: "Customize the look and feel of your dashboard.",
        href: "/dashboard/settings/appearance",
        icon: PaletteIcon,
    },
];

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and application preferences.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {settingsLinks.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <item.icon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{item.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
