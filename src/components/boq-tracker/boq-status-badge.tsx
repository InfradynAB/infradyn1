import { Badge } from "@/components/ui/badge";
import type { BoqTrackerStatus } from "@/lib/actions/boq-tracker";

export function BoqStatusBadge({ status }: { status: BoqTrackerStatus }) {
  if (status === "LATE") {
    return <Badge variant="destructive">🔴 Late</Badge>;
  }

  if (status === "AT_RISK") {
    return <Badge variant="secondary">🟡 At risk</Badge>;
  }

  if (status === "NO_REQUIRED_DATE") {
    return <Badge variant="outline">No required date</Badge>;
  }

  return <Badge>🟢 On track</Badge>;
}
