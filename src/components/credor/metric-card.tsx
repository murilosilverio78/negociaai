import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({ title, value, icon: Icon, trend, trendUp }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-xs",
                  trendUp ? "text-green-600" : "text-red-600"
                )}
              >
                {trend}
              </p>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
