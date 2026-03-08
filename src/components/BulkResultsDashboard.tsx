import { ValidationResult } from "@/types/validation";
import { GlowCard } from "@/components/ui/GlowCard";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Phone,
  CheckCircle2,
  XCircle,
  Signal,
  Globe,
  Radio,
  Shield,
  Download,
} from "lucide-react";
import { exportCSV, exportWhatsAppActiveCSV, exportWhatsAppNotActiveCSV } from "@/lib/exportResults";

interface BulkResultsDashboardProps {
  whatsappActive: ValidationResult[];
  whatsappNotActive: ValidationResult[];
  onSelectForMessaging: (numbers: ValidationResult[]) => void;
}

function ResultRow({ result }: { result: ValidationResult }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-all">
      <div className="shrink-0">
        {result.isActive ? (
          <Signal className="w-4 h-4 text-success" />
        ) : (
          <Signal className="w-4 h-4 text-muted-foreground opacity-40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-foreground truncate">
          {result.countryCode} {result.phoneNumber}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {result.carrier}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className={cn(
            "text-xs capitalize",
            result.lineType === 'mobile' ? "text-success" : "text-warning"
          )}>
            {result.lineType}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {result.countryName}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <div className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          result.isActive
            ? "bg-success/20 text-success"
            : "bg-muted text-muted-foreground"
        )}>
          {result.isActive ? 'Active' : 'Inactive'}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono",
          result.confidenceScore >= 80
            ? "bg-success/10 text-success"
            : result.confidenceScore >= 50
              ? "bg-warning/10 text-warning"
              : "bg-destructive/10 text-destructive"
        )}>
          <Shield className="w-3 h-3" />
          {result.confidenceScore}
        </div>
      </div>
    </div>
  );
}

export function BulkResultsDashboard({
  whatsappActive,
  whatsappNotActive,
  onSelectForMessaging,
}: BulkResultsDashboardProps) {
  if (whatsappActive.length === 0 && whatsappNotActive.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Export Bar */}
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(whatsappActive, whatsappNotActive)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export All (CSV)
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlowCard variant="gradient" className="text-center py-4">
          <p className="text-3xl font-bold font-mono text-foreground">{whatsappActive.length + whatsappNotActive.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Processed</p>
        </GlowCard>
        <GlowCard variant="gradient" className="text-center py-4">
          <p className="text-3xl font-bold font-mono text-success">{whatsappActive.length + whatsappNotActive.filter(r => r.isValid).length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Valid Numbers</p>
        </GlowCard>
        <GlowCard variant="gradient" className="text-center py-4" glowColor="success">
          <p className="text-3xl font-bold font-mono text-success">{whatsappActive.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">WhatsApp Active</p>
        </GlowCard>
        <GlowCard variant="gradient" className="text-center py-4" glowColor="warning">
          <p className="text-3xl font-bold font-mono text-warning">{whatsappNotActive.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">No WhatsApp</p>
        </GlowCard>
      </div>

      {/* Two Column Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Active */}
        <GlowCard glowColor="success">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/20">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">WhatsApp Active</h3>
                <p className="text-xs text-muted-foreground">{whatsappActive.length} numbers</p>
              </div>
            </div>
            {whatsappActive.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportWhatsAppActiveCSV(whatsappActive)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={() => onSelectForMessaging(whatsappActive)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Send Messages
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {whatsappActive.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No WhatsApp active numbers found</p>
              </div>
            ) : (
              whatsappActive.map((result, i) => (
                <ResultRow key={i} result={result} />
              ))
            )}
          </div>
        </GlowCard>

        {/* WhatsApp Not Active */}
        <GlowCard glowColor="warning">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/20">
                <XCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">No WhatsApp</h3>
                <p className="text-xs text-muted-foreground">{whatsappNotActive.length} numbers</p>
              </div>
            </div>
            {whatsappNotActive.length > 0 && (
              <button
                onClick={() => exportWhatsAppNotActiveCSV(whatsappNotActive)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {whatsappNotActive.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">All numbers have WhatsApp</p>
              </div>
            ) : (
              whatsappNotActive.map((result, i) => (
                <ResultRow key={i} result={result} />
              ))
            )}
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
