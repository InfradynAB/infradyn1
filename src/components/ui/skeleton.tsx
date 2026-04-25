import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md",
        "bg-slate-200 dark:bg-[oklch(28%_0.02_238)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
