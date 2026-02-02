import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'success' | 'warning' | 'accent';
  variant?: 'default' | 'gradient';
}

export function GlowCard({ 
  children, 
  className, 
  glowColor = 'primary',
  variant = 'default'
}: GlowCardProps) {
  const glowClasses = {
    primary: 'hover:shadow-glow-md',
    success: 'hover:shadow-glow-success',
    warning: 'hover:shadow-glow-warning',
    accent: 'hover:shadow-glow-accent',
  };

  return (
    <div 
      className={cn(
        "relative rounded-lg border border-border bg-card p-6 transition-all duration-300",
        glowClasses[glowColor],
        variant === 'gradient' && 'bg-gradient-to-br from-card to-background',
        className
      )}
    >
      {children}
    </div>
  );
}
