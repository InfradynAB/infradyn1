import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NotificationsSettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Notifications</h1>
                <p className="text-muted-foreground">Configure how you receive alerts.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Choose which emails you want to receive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="po-updates">PO Status Updates</Label>
                        <Switch id="po-updates" disabled />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="delivery-alerts">Delivery Alerts</Label>
                        <Switch id="delivery-alerts" disabled />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="ncr-notifications">NCR Notifications</Label>
                        <Switch id="ncr-notifications" disabled />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="payment-reminders">Payment Reminders</Label>
                        <Switch id="payment-reminders" disabled />
                    </div>
                    <p className="text-sm text-muted-foreground">Notification preferences coming soon.</p>
                </CardContent>
            </Card>
        </div>
    );
}
