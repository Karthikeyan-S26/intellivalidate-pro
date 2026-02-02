import { ValidationResult } from "@/types/validation";
import { GlowCard } from "@/components/ui/GlowCard";
import { ConfidenceGauge } from "@/components/ConfidenceGauge";
import { cn } from "@/lib/utils";
import {
  Phone,
  MapPin,
  Radio,
  MessageSquare,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface ValidationResultsProps {
  result: ValidationResult | null;
}

export function ValidationResults({ result }: ValidationResultsProps) {
  if (!result) {
    return (
      <GlowCard className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No validation results yet</p>
          <p className="text-xs mt-1">Enter a phone number to begin</p>
        </div>
      </GlowCard>
    );
  }

  const getWhatsAppStatusConfig = () => {
    switch (result.whatsappStatus) {
      case 'verified':
        return { icon: CheckCircle2, color: 'text-success', label: 'WhatsApp Verified', bg: 'bg-success/10' };
      case 'not_found':
        return { icon: XCircle, color: 'text-destructive', label: 'Not on WhatsApp', bg: 'bg-destructive/10' };
      case 'unchecked':
        return { icon: AlertTriangle, color: 'text-warning', label: 'Check Skipped', bg: 'bg-warning/10' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', label: 'Checking...', bg: 'bg-muted/10' };
    }
  };

  const whatsAppConfig = getWhatsAppStatusConfig();
  const WhatsAppIcon = whatsAppConfig.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Result Card */}
      <GlowCard className="lg:col-span-2" glowColor={result.isValid ? 'success' : 'warning'}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Validation Result</h3>
            <p className="font-mono text-2xl text-primary">
              {result.countryCode} {result.phoneNumber}
            </p>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium",
            result.isValid ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}>
            {result.isValid ? 'Valid Number' : 'Invalid'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Country</span>
            </div>
            <p className="font-medium">{result.countryName}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Radio className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Carrier</span>
            </div>
            <p className="font-medium">{result.carrier}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Phone className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Line Type</span>
            </div>
            <p className={cn(
              "font-medium capitalize",
              result.lineType === 'mobile' && "text-success",
              result.lineType === 'landline' && "text-warning"
            )}>
              {result.lineType}
            </p>
          </div>

          <div className={cn("p-4 rounded-lg", whatsAppConfig.bg)}>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <WhatsAppIcon className={cn("w-4 h-4", whatsAppConfig.color)} />
              <p className={cn("font-medium", whatsAppConfig.color)}>
                {whatsAppConfig.label}
              </p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Confidence Score */}
      <GlowCard className="flex flex-col items-center justify-center" glowColor="primary">
        <ConfidenceGauge score={result.confidenceScore} />
      </GlowCard>

      {/* Metrics Row */}
      <div className="lg:col-span-3 grid grid-cols-3 gap-4">
        <GlowCard className="text-center" variant="gradient">
          <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono">{result.validationTime}ms</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Processing Time</p>
        </GlowCard>

        <GlowCard className="text-center" variant="gradient" glowColor="success">
          <DollarSign className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono text-success">${result.costSaved.toFixed(3)}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cost Saved</p>
        </GlowCard>

        <GlowCard className="text-center" variant="gradient" glowColor="warning">
          <RefreshCw className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold font-mono">{result.retryCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Retries</p>
        </GlowCard>
      </div>
    </div>
  );
}
