import { Suspense } from "react";
import DeliveryCategoriesContent from "./content";

export const metadata = {
    title: "Delivery Categories | Infradyn Analytics",
    description: "Discipline & material class breakdown with ROS-based status tracking",
};

export default function DeliveryCategoriesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Loading delivery analytics…
            </div>
        }>
            <DeliveryCategoriesContent />
        </Suspense>
    );
}
