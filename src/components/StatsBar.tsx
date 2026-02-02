import { Activity, CheckCircle, Clock, TrendingUp } from "lucide-react";

interface StatsBarProps {
  totalValidations: number;
  successRate: number;
  avgResponseTime: number;
  totalSaved: number;
}

export function StatsBar({ totalValidations, successRate, avgResponseTime, totalSaved }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold font-mono">{totalValidations.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Validations</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <div>
          <p className="text-xl font-bold font-mono text-success">{successRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10">
          <Clock className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-xl font-bold font-mono">{avgResponseTime}ms</p>
          <p className="text-xs text-muted-foreground">Avg Response</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-warning/10">
          <TrendingUp className="w-5 h-5 text-warning" />
        </div>
        <div>
          <p className="text-xl font-bold font-mono text-warning">${totalSaved.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Saved</p>
        </div>
      </div>
    </div>
  );
}
