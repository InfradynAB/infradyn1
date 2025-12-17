"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon, DesktopIcon } from "@phosphor-icons/react";

export default function AppearanceSettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Appearance</h1>
                <p className="text-muted-foreground">Customize how the dashboard looks.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Select your preferred color scheme.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={() => setTheme("light")}
                        className="flex-1 gap-2"
                    >
                        <SunIcon className="h-4 w-4" />
                        Light
                    </Button>
                    <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={() => setTheme("dark")}
                        className="flex-1 gap-2"
                    >
                        <MoonIcon className="h-4 w-4" />
                        Dark
                    </Button>
                    <Button
                        variant={theme === "system" ? "default" : "outline"}
                        onClick={() => setTheme("system")}
                        className="flex-1 gap-2"
                    >
                        <DesktopIcon className="h-4 w-4" />
                        System
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
