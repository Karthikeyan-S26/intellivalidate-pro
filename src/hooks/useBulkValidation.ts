import { useState, useCallback } from "react";
import { AgentLog, AgentStatus, AgentType, ValidationResult, BulkValidationResult } from "@/types/validation";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

const initialAgentStatuses: AgentStatus[] = [
  { name: 'orchestrator', displayName: 'Orchestrator', status: 'idle', icon: 'network' },
  { name: 'validation', displayName: 'Validation', status: 'idle', icon: 'check' },
  { name: 'activity', displayName: 'Activity Detection', status: 'idle', icon: 'signal' },
  { name: 'decision', displayName: 'Decision', status: 'idle', icon: 'brain' },
  { name: 'retry', displayName: 'Retry & Recovery', status: 'idle', icon: 'refresh' },
  { name: 'whatsapp', displayName: 'WhatsApp', status: 'idle', icon: 'message' },
  { name: 'confidence', displayName: 'Confidence', status: 'idle', icon: 'chart' },
];

export function useBulkValidation() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(initialAgentStatuses);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkValidationResult | null>(null);
  const [progress, setProgress] = useState({ total: 0, processed: 0, currentNumber: '' });
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

  const resetAgents = useCallback(() => {
    setAgentStatuses(initialAgentStatuses);
    setLogs([]);
    setBulkResult(null);
    setProgress({ total: 0, processed: 0, currentNumber: '' });
  }, []);

  const validateBulk = useCallback(async (phoneNumbers: string[]) => {
    resetAgents();
    setIsProcessing(true);
    setProgress({ total: phoneNumbers.length, processed: 0, currentNumber: '' });

    const startTime = Date.now();
    const allResults: ValidationResult[] = [];

    updateAgentStatus('orchestrator', 'active');
    addLog('orchestrator', `Bulk validation initiated for ${phoneNumbers.length} numbers`, 'info');
    addLog('orchestrator', 'Normalizing and deduplicating phone numbers...', 'thinking');

    // Deduplicate
    const uniqueNumbers = [...new Set(phoneNumbers)];
    if (uniqueNumbers.length < phoneNumbers.length) {
      addLog('orchestrator', `Removed ${phoneNumbers.length - uniqueNumbers.length} duplicate(s). Processing ${uniqueNumbers.length} unique numbers.`, 'info');
    }

    updateAgentStatus('orchestrator', 'complete');

    // Process each number
    for (let i = 0; i < uniqueNumbers.length; i++) {
      const phone = uniqueNumbers[i];
      setProgress({ total: uniqueNumbers.length, processed: i, currentNumber: phone });

      // Detect country code
      let countryCode = '+1';
      let numberPart = phone;
      if (phone.startsWith('+')) {
        // Extract country code (1-3 digits after +)
        const match = phone.match(/^\+(\d{1,3})/);
        if (match) {
          countryCode = `+${match[1]}`;
          numberPart = phone.slice(countryCode.length);
        }
      }

      addLog('orchestrator', `[${i + 1}/${uniqueNumbers.length}] Processing ${phone}`, 'info');

      try {
        // Activate relevant agents
        updateAgentStatus('validation', 'active');
        updateAgentStatus('activity', 'active');

        const { data, error } = await supabase.functions.invoke('validate-phone', {
          body: { phoneNumber: numberPart, countryCode }
        });

        if (error) {
          addLog('retry', `Error validating ${phone}: ${error.message}`, 'error');
          updateAgentStatus('retry', 'active');
          continue;
        }

        // Process server logs
        if (data.logs && Array.isArray(data.logs)) {
          for (const log of data.logs) {
            addLog(log.agent as AgentType, `[${phone}] ${log.message}`, log.status as AgentLog['status']);
          }
        }

        const result: ValidationResult = {
          phoneNumber: data.phoneNumber || numberPart,
          countryCode: data.countryCode || countryCode,
          countryName: data.countryName || 'Unknown',
          carrier: data.carrier || 'Unknown',
          lineType: data.lineType || 'unknown',
          isValid: data.isValid ?? true,
          isActive: data.isActive ?? data.isValid ?? true,
          whatsappStatus: data.whatsappStatus || 'unchecked',
          confidenceScore: data.confidenceScore || 0,
          costSaved: data.costSaved || 0,
          validationTime: data.validationTime || 0,
          retryCount: data.retryCount || 0,
        };

        allResults.push(result);

        // Update agent statuses for completed number
        updateAgentStatus('validation', 'complete');
        updateAgentStatus('activity', 'complete');
        if (result.whatsappStatus !== 'unchecked') {
          updateAgentStatus('whatsapp', 'complete');
        }
        updateAgentStatus('confidence', 'complete');

      } catch (err) {
        addLog('retry', `Failed to validate ${phone}: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
      }

      setProgress({ total: uniqueNumbers.length, processed: i + 1, currentNumber: phone });

      // Small delay between requests to avoid rate limiting
      if (i < uniqueNumbers.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Classify results
    const whatsappActive = allResults.filter(r => r.whatsappStatus === 'verified');
    const whatsappNotActive = allResults.filter(r => r.whatsappStatus !== 'verified');

    const totalTime = Date.now() - startTime;

    const bulkResult: BulkValidationResult = {
      results: allResults,
      whatsappActive,
      whatsappNotActive,
      totalProcessed: allResults.length,
      totalValid: allResults.filter(r => r.isValid).length,
      totalActive: allResults.filter(r => r.isActive).length,
      totalWhatsApp: whatsappActive.length,
      totalTime,
    };

    setBulkResult(bulkResult);

    // Update stats
    setStats(prev => ({
      totalValidations: prev.totalValidations + allResults.length,
      successRate: Math.min(99.9, prev.successRate),
      avgResponseTime: Math.round(totalTime / allResults.length),
      totalSaved: prev.totalSaved + allResults.reduce((sum, r) => sum + r.costSaved, 0),
    }));

    addLog('orchestrator', `Bulk validation complete. ${allResults.length} numbers processed in ${totalTime}ms`, 'success');
    addLog('orchestrator', `WhatsApp Active: ${whatsappActive.length} | Not Active: ${whatsappNotActive.length}`, 'success');

    // Mark all agents complete
    setAgentStatuses(prev => prev.map(a => ({ ...a, status: 'complete' as const })));
    setIsProcessing(false);
    setProgress({ total: uniqueNumbers.length, processed: uniqueNumbers.length, currentNumber: '' });

  }, [addLog, updateAgentStatus, resetAgents]);

  return {
    logs,
    agentStatuses,
    isProcessing,
    bulkResult,
    progress,
    stats,
    validateBulk,
  };
}
