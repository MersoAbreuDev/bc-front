import React from "react";
import { cn } from "@/lib/utils";

export default function DashboardCard({
  title,
  value,
  children,
  icon,
  color = "bg-orange-100 text-orange-600",
  className,
}: {
  title: string;
  value: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm flex flex-col justify-between h-32", className)}>
      <div className="flex items-center gap-3">
        {icon ? (
          <div className={cn("p-2 rounded-md w-10 h-10 flex items-center justify-center", color)}>
            {icon}
          </div>
        ) : null}
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>

      <div className="text-center my-1">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {children ? <div className="mt-2 text-sm text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
