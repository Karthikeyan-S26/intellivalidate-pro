import { useState } from "react";
import { Header } from "@/components/Header";
import { BulkUpload } from "@/components/BulkUpload";
import { AgentTerminal } from "@/components/AgentTerminal";
import { AgentStatusPanel } from "@/components/AgentStatusPanel";
import { BulkResultsDashboard } from "@/components/BulkResultsDashboard";
import { BulkProgress } from "@/components/BulkProgress";
import { WhatsAppMessaging } from "@/components/WhatsAppMessaging";
import { StatsBar } from "@/components/StatsBar";
import { useBulkValidation } from "@/hooks/useBulkValidation";
import { ValidationResult } from "@/types/validation";
import { Sparkles } from "lucide-react";

const Index = () => {
  const { logs, agentStatuses, isProcessing, bulkResult, progress, stats, validateBulk } = useBulkValidation();
  const [messagingRecipients, setMessagingRecipients] = useState<ValidationResult[] | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by Multi-Agent AI</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Bulk Phone Validation
            <br />
            <span className="text-primary">& WhatsApp Intelligence</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload up to 100 phone numbers. Our AI agents validate, detect active status, 
            identify WhatsApp accounts, and enable bulk messaging — all with cross-provider verification.
          </p>
        </section>

        {/* Stats Bar */}
        <StatsBar {...stats} />

        {/* WhatsApp Messaging Modal */}
        {messagingRecipients && (
          <WhatsAppMessaging
            recipients={messagingRecipients}
            onClose={() => setMessagingRecipients(null)}
          />
        )}

        {/* Bulk Upload */}
        {!messagingRecipients && (
          <BulkUpload onValidate={validateBulk} isLoading={isProcessing} />
        )}

        {/* Progress */}
        {isProcessing && (
          <BulkProgress
            total={progress.total}
            processed={progress.processed}
            currentNumber={progress.currentNumber}
            isComplete={false}
          />
        )}

        {/* Agent Status Panel */}
        {(isProcessing || bulkResult) && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Agent Pipeline Status
            </h3>
            <AgentStatusPanel agents={agentStatuses} />
          </section>
        )}

        {/* Results Dashboard */}
        {bulkResult && !messagingRecipients && (
          <BulkResultsDashboard
            whatsappActive={bulkResult.whatsappActive}
            whatsappNotActive={bulkResult.whatsappNotActive}
            onSelectForMessaging={setMessagingRecipients}
          />
        )}

        {/* Agent Terminal */}
        {(isProcessing || logs.length > 0) && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Agent Reasoning Trace
            </h3>
            <div className="h-[400px]">
              <AgentTerminal logs={logs} isProcessing={isProcessing} />
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-muted-foreground text-sm border-t border-border mt-12">
          <p>ValideX AI — Multi-Agent Bulk Validation Engine</p>
          <p className="text-xs mt-2">
            Cross-provider verification • Active number detection • WhatsApp intelligence • Bulk messaging
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
