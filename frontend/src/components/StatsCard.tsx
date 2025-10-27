import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  trend?: "up" | "down";
}

const StatsCard = ({ title, value, change, icon: Icon, trend }: StatsCardProps) => {
  return (
    <Card className="p-6 border-gradient card-glow hover:glow-cyan transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p className={`text-sm ${trend === "up" ? "text-secondary" : "text-destructive"}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10 glow-cyan">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
