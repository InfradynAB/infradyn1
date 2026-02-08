"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject } from "@/lib/actions/project";
import { toast } from "sonner";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";

// Define simplified Org type for props
type Organization = {
    id: string;
    name: string;
};

interface CreateProjectDialogProps {
    organizations: Organization[];
}

export function CreateProjectDialog({ organizations }: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const result = await createProject(formData);

        if (result?.error) {
            toast.error(result.error);
            if (result.details) {
                Object.values(result.details).flat().forEach((msg) => toast.error(String(msg)));
            }
            setIsLoading(false);
        } else if (result?.success && result.projectId) {
            toast.success(`Project created! Code: ${result.projectCode}`);
            setOpen(false);
            setIsLoading(false);
            // Redirect to the new project dashboard
            router.push(`/dashboard/projects/${result.projectId}`);
        } else {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                    <DialogDescription>
                        Start a new project within your organization.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="organizationId">Organization</Label>
                            <Select name="organizationId" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {organizations.map(org => (
                                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input id="name" name="name" placeholder="Suspension Bridge Alpha" required />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Select name="currency" defaultValue="USD">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Major Currencies */}
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="KES">KES (Sh)</SelectItem>
                                    {/* European Currencies */}
                                    <SelectItem value="CHF">CHF (Fr) - Swiss Franc</SelectItem>
                                    <SelectItem value="SEK">SEK (kr) - Swedish Krona</SelectItem>
                                    <SelectItem value="NOK">NOK (kr) - Norwegian Krone</SelectItem>
                                    <SelectItem value="DKK">DKK (kr) - Danish Krone</SelectItem>
                                    <SelectItem value="PLN">PLN (zł) - Polish Zloty</SelectItem>
                                    <SelectItem value="CZK">CZK (Kč) - Czech Koruna</SelectItem>
                                    <SelectItem value="HUF">HUF (Ft) - Hungarian Forint</SelectItem>
                                    <SelectItem value="RON">RON (lei) - Romanian Leu</SelectItem>
                                    <SelectItem value="BGN">BGN (лв) - Bulgarian Lev</SelectItem>
                                    <SelectItem value="HRK">HRK (kn) - Croatian Kuna</SelectItem>
                                    <SelectItem value="RSD">RSD (дин) - Serbian Dinar</SelectItem>
                                    <SelectItem value="UAH">UAH (₴) - Ukrainian Hryvnia</SelectItem>
                                    <SelectItem value="ISK">ISK (kr) - Icelandic Króna</SelectItem>
                                    <SelectItem value="TRY">TRY (₺) - Turkish Lira</SelectItem>
                                    <SelectItem value="RUB">RUB (₽) - Russian Ruble</SelectItem>
                                    <SelectItem value="GEL">GEL (₾) - Georgian Lari</SelectItem>
                                    <SelectItem value="AMD">AMD (֏) - Armenian Dram</SelectItem>
                                    <SelectItem value="AZN">AZN (₼) - Azerbaijani Manat</SelectItem>
                                    <SelectItem value="MDL">MDL (L) - Moldovan Leu</SelectItem>
                                    <SelectItem value="ALL">ALL (L) - Albanian Lek</SelectItem>
                                    <SelectItem value="MKD">MKD (ден) - Macedonian Denar</SelectItem>
                                    <SelectItem value="BAM">BAM (KM) - Bosnia Mark</SelectItem>
                                    <SelectItem value="BYN">BYN (Br) - Belarusian Ruble</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Project code will be auto-generated</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <LocationAutocomplete name="location" placeholder="Search city or address..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="budget">Budget (Optional)</Label>
                                <Input id="budget" name="budget" type="number" placeholder="1000000" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <DatePicker id="startDate" name="startDate" placeholder="yyyy/mm/dd" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <DatePicker id="endDate" name="endDate" placeholder="yyyy/mm/dd" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
