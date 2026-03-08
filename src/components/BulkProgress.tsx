import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2 } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";

interface BulkProgressProps {
  total: number;
  processed: number;
  currentNumber?: string;
  isComplete: boolean;
}

export function BulkProgress({ total, processed, currentNumber, isComplete }: BulkProgressProps) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <GlowCard className="max-w-4xl mx-auto" variant="gradient">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
            <span className="text-sm font-medium text-foreground">
              {isComplete ? 'Validation Complete' : `Processing ${processed} of ${total}`}
            </span>
          </div>
          <span className="text-sm font-mono text-primary">{percentage}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isComplete ? "bg-success" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {currentNumber && !isComplete && (
          <p className="text-xs font-mono text-muted-foreground text-center">
            Currently validating: {currentNumber}
          </p>
        )}
      </div>
    </GlowCard>
  );
}
