import { useState, useCallback } from "react";
import { AgentLog, AgentStatus, AgentType, ValidationResult } from "@/types/validation";
import { v4 as uuidv4 } from "uuid";

const initialAgentStatuses: AgentStatus[] = [
  { name: 'orchestrator', displayName: 'Orchestrator', status: 'idle', icon: 'network' },
  { name: 'validation', displayName: 'Validation', status: 'idle', icon: 'check' },
  { name: 'decision', displayName: 'Decision', status: 'idle', icon: 'brain' },
  { name: 'retry', displayName: 'Retry', status: 'idle', icon: 'refresh' },
  { name: 'whatsapp', displayName: 'WhatsApp', status: 'idle', icon: 'message' },
  { name: 'confidence', displayName: 'Confidence', status: 'idle', icon: 'chart' },
];

const carriersByCountry: Record<string, string[]> = {
  '+1': ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'],
  '+44': ['Vodafone UK', 'EE', 'O2', 'Three'],
  '+91': ['Jio', 'Airtel', 'Vodafone India', 'BSNL'],
  '+52': ['Telcel', 'Movistar', 'AT&T México'],
  '+55': ['Vivo', 'Claro', 'TIM', 'Oi'],
  '+49': ['Deutsche Telekom', 'Vodafone DE', 'O2 Germany'],
  '+33': ['Orange', 'SFR', 'Bouygues', 'Free Mobile'],
  '+81': ['NTT Docomo', 'SoftBank', 'KDDI'],
  '+86': ['China Mobile', 'China Unicom', 'China Telecom'],
  '+61': ['Telstra', 'Optus', 'Vodafone AU'],
};

const countryNames: Record<string, string> = {
  '+1': 'United States',
  '+44': 'United Kingdom',
  '+91': 'India',
  '+52': 'Mexico',
  '+55': 'Brazil',
  '+49': 'Germany',
  '+33': 'France',
  '+81': 'Japan',
  '+86': 'China',
  '+61': 'Australia',
};

export function useValidation() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(initialAgentStatuses);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [stats, setStats] = useState({
    totalValidations: 1247,
    successRate: 98.4,
    avgResponseTime: 342,
    totalSaved: 156.78,
  });

  const addLog = useCallback((agent: AgentType, message: string, status: AgentLog['status']) => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      timestamp: new Date(),
      agent,
      message,
      status,
    }]);
  }, []);

  const updateAgentStatus = useCallback((agent: AgentType, status: AgentStatus['status']) => {
    setAgentStatuses(prev => prev.map(a => 
      a.name === agent ? { ...a, status } : a
    ));
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const resetAgents = useCallback(() => {
    setAgentStatuses(initialAgentStatuses);
    setLogs([]);
  }, []);

  const validate = useCallback(async (phoneNumber: string, countryCode: string) => {
    resetAgents();
    setIsProcessing(true);
    setResult(null);

    const startTime = Date.now();
    let retryCount = 0;
    const carriers = carriersByCountry[countryCode] || ['Unknown Carrier'];
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    const lineType = Math.random() > 0.2 ? 'mobile' : (Math.random() > 0.5 ? 'landline' : 'voip');

    try {
      // Orchestrator Agent
      updateAgentStatus('orchestrator', 'active');
      addLog('orchestrator', `Received validation request for ${countryCode} ${phoneNumber}`, 'info');
      await delay(300);
      addLog('orchestrator', 'Initializing multi-agent pipeline...', 'thinking');
      await delay(400);
      addLog('orchestrator', 'Dispatching to Validation Agent', 'success');
      updateAgentStatus('orchestrator', 'complete');

      // Validation Agent
      updateAgentStatus('validation', 'active');
      addLog('validation', 'Performing syntax validation...', 'thinking');
      await delay(500);
      addLog('validation', `Format check passed. Country: ${countryNames[countryCode] || 'Unknown'}`, 'success');
      await delay(300);
      
      // Simulate potential API issue
      const hasApiIssue = Math.random() > 0.7;
      if (hasApiIssue) {
        addLog('validation', 'Primary provider returned 429 (Rate Limit). Notifying Decision Agent.', 'warning');
        await delay(200);
        updateAgentStatus('validation', 'complete');
        
        // Retry Agent kicks in
        updateAgentStatus('retry', 'active');
        addLog('retry', 'Rate limit detected. Analyzing fallback options...', 'thinking');
        await delay(400);
        addLog('retry', 'Switching to NumVerify API (Provider B)', 'info');
        await delay(500);
        retryCount = 1;
        addLog('retry', 'Provider swap successful. Continuing validation.', 'success');
        updateAgentStatus('retry', 'complete');
        
        updateAgentStatus('validation', 'active');
      }
      
      addLog('validation', `Carrier lookup: ${carrier}`, 'success');
      await delay(300);
      addLog('validation', `Line type detected: ${lineType.toUpperCase()}`, 'success');
      updateAgentStatus('validation', 'complete');

      // Decision Agent
      updateAgentStatus('decision', 'active');
      addLog('decision', 'Analyzing validation results...', 'thinking');
      await delay(400);
      
      let skipWhatsApp = false;
      let costSaved = 0;
      
      if (lineType === 'landline') {
        addLog('decision', 'DECISION: Landline detected. Skipping WhatsApp check to optimize costs.', 'warning');
        skipWhatsApp = true;
        costSaved = 0.012;
        await delay(300);
        addLog('decision', `Cost saved: $${costSaved.toFixed(3)} (WhatsApp API call avoided)`, 'success');
      } else {
        addLog('decision', 'Mobile/VoIP detected. Proceeding with WhatsApp verification.', 'success');
      }
      updateAgentStatus('decision', 'complete');

      // WhatsApp Agent
      let whatsappStatus: ValidationResult['whatsappStatus'] = 'unchecked';
      
      if (!skipWhatsApp) {
        updateAgentStatus('whatsapp', 'active');
        addLog('whatsapp', 'Initiating WhatsApp Business API lookup...', 'thinking');
        await delay(600);
        addLog('whatsapp', 'Querying Twilio WhatsApp Sandbox...', 'info');
        await delay(500);
        
        const hasWhatsApp = Math.random() > 0.3;
        if (hasWhatsApp) {
          addLog('whatsapp', 'WhatsApp account VERIFIED ✓', 'success');
          whatsappStatus = 'verified';
        } else {
          addLog('whatsapp', 'No WhatsApp account associated with this number', 'warning');
          whatsappStatus = 'not_found';
        }
        updateAgentStatus('whatsapp', 'complete');
      } else {
        updateAgentStatus('whatsapp', 'complete');
        addLog('whatsapp', 'Check skipped per Decision Agent directive', 'info');
      }

      // Confidence Scoring Agent
      updateAgentStatus('confidence', 'active');
      addLog('confidence', 'Computing confidence score using formula: S = (V×0.4) + (W×0.4) + (Q×0.2) - (R×5)', 'thinking');
      await delay(400);
      
      // Calculate confidence score
      const V = 1; // Validation success
      const W = whatsappStatus === 'verified' ? 1 : (whatsappStatus === 'unchecked' ? 0.5 : 0);
      const Q = hasApiIssue ? 0.7 : 1; // Quality of response
      const R = retryCount;
      
      const rawScore = (V * 0.4) + (W * 0.4) + (Q * 0.2) - (R * 0.05);
      const confidenceScore = Math.min(100, Math.max(0, Math.round(rawScore * 100)));
      
      addLog('confidence', `V=${V}, W=${W.toFixed(1)}, Q=${Q.toFixed(1)}, R=${R}`, 'info');
      await delay(300);
      addLog('confidence', `Final confidence score: ${confidenceScore}/100`, 'success');
      updateAgentStatus('confidence', 'complete');

      // Finalize
      const validationTime = Date.now() - startTime;
      
      setResult({
        phoneNumber: phoneNumber.replace(/-/g, ''),
        countryCode,
        countryName: countryNames[countryCode] || 'Unknown',
        carrier,
        lineType: lineType as ValidationResult['lineType'],
        isValid: true,
        whatsappStatus,
        confidenceScore,
        costSaved,
        validationTime,
        retryCount,
      });

      // Update stats
      setStats(prev => ({
        totalValidations: prev.totalValidations + 1,
        successRate: Math.min(99.9, prev.successRate + 0.01),
        avgResponseTime: Math.round((prev.avgResponseTime + validationTime) / 2),
        totalSaved: prev.totalSaved + costSaved,
      }));

      addLog('orchestrator', `Validation complete. Total time: ${validationTime}ms`, 'success');

    } catch (error) {
      addLog('orchestrator', 'Critical error in validation pipeline', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [addLog, updateAgentStatus, resetAgents]);

  return {
    logs,
    agentStatuses,
    isProcessing,
    result,
    stats,
    validate,
  };
}
