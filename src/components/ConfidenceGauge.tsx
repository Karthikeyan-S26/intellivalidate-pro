import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  score: number;
  size?: number;
  animated?: boolean;
}

export function ConfidenceGauge({ score, size = 180, animated = true }: ConfidenceGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score, animated]);

  const getScoreColor = () => {
    if (displayScore >= 80) return 'hsl(var(--success))';
    if (displayScore >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getScoreLabel = () => {
    if (displayScore >= 80) return 'High Confidence';
    if (displayScore >= 50) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300"
            style={{
              filter: `drop-shadow(0 0 8px ${getScoreColor()})`,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="text-4xl font-bold font-mono"
            style={{ color: getScoreColor() }}
          >
            {displayScore}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Score
          </span>
        </div>
      </div>
      
      <div className={cn(
        "px-3 py-1 rounded-full text-xs font-medium",
        displayScore >= 80 && "bg-success/20 text-success",
        displayScore >= 50 && displayScore < 80 && "bg-warning/20 text-warning",
        displayScore < 50 && "bg-destructive/20 text-destructive"
      )}>
        {getScoreLabel()}
      </div>
    </div>
  );
}
