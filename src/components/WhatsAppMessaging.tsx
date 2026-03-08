import { useState } from "react";
import { ValidationResult } from "@/types/validation";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface WhatsAppMessagingProps {
  recipients: ValidationResult[];
  onClose: () => void;
}

export function WhatsAppMessaging({ recipients, onClose }: WhatsAppMessagingProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message to send.');
      return;
    }

    setIsSending(true);

    // Simulate sending - in production, this would call WhatsApp Cloud API
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSending(false);
    setSent(true);
    toast.success(`Messages queued for ${recipients.length} recipients!`);
  };

  if (sent) {
    return (
      <GlowCard className="max-w-3xl mx-auto" glowColor="success">
        <div className="text-center py-8 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h3 className="text-xl font-semibold text-foreground">Messages Queued Successfully</h3>
          <p className="text-muted-foreground">
            {recipients.length} messages have been queued for delivery via WhatsApp.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-warning bg-warning/10 p-3 rounded-lg max-w-md mx-auto">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Note: WhatsApp Business API integration required for actual delivery. Connect your API credentials in settings.</span>
          </div>
          <Button onClick={onClose} variant="outline" className="mt-4">
            Back to Results
          </Button>
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="max-w-3xl mx-auto" glowColor="success">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <MessageSquare className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Bulk WhatsApp Message</h3>
              <p className="text-sm text-muted-foreground">
                Send to {recipients.length} WhatsApp-active numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipients Preview */}
        <div className="p-4 rounded-lg bg-background/50 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Recipients ({recipients.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {recipients.map((r, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-xs font-mono text-success"
              >
                {r.countryCode}{r.phoneNumber}
              </span>
            ))}
          </div>
        </div>

        {/* Message Editor */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Message Template
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi, we would like to introduce our services..."
            className="min-h-[140px] bg-background/50 border-border"
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
            <p className="text-xs text-warning">
              WhatsApp Business API required for delivery
            </p>
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className={cn(
            "w-full py-3 font-semibold transition-all duration-300",
            "bg-success text-success-foreground hover:bg-success/90",
            "hover:shadow-glow-success"
          )}
        >
          {isSending ? (
            <>Sending messages...</>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Message to {recipients.length} WhatsApp Users
            </>
          )}
        </Button>
      </div>
    </GlowCard>
  );
}
