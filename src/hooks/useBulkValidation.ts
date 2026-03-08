import { useState, useCallback } from "react";
import { AgentLog, AgentStatus, AgentType, ValidationResult, BulkValidationResult } from "@/types/validation";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { extractDigits } from "@/lib/phoneValidation";

const initialAgentStatuses: AgentStatus[] = [
  { name: 'orchestrator', displayName: 'Orchestrator', status: 'idle', icon: 'network' },
  { name: 'decision', displayName: 'Decision', status: 'idle', icon: 'brain' },
  { name: 'validation', displayName: 'Validation', status: 'idle', icon: 'check' },
  { name: 'activity', displayName: 'Activity Detection', status: 'idle', icon: 'signal' },
  { name: 'whatsapp', displayName: 'WhatsApp', status: 'idle', icon: 'message' },
  { name: 'confidence', displayName: 'Confidence', status: 'idle', icon: 'chart' },
  { name: 'retry', displayName: 'Retry & Recovery', status: 'idle', icon: 'refresh' },
];

export function useBulkValidation() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(initialAgentStatuses);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkValidationResult | null>(null);
  const [progress, setProgress] = useState({ total: 0, processed: 0, currentNumber: '' });
  const [stats, setStats] = useState({
    totalValidations: 0,
    successRate: 0,
    avgResponseTime: 0,
    totalSaved: 0,
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
    const rejectedNumbers: string[] = [];

    updateAgentStatus('orchestrator', 'active');
    addLog('orchestrator', `Bulk validation initiated for ${phoneNumbers.length} numbers`, 'info');

    // === PRE-VALIDATION: Enforce minimum 10-digit rule ===
    addLog('orchestrator', 'Running pre-validation (minimum 10-digit rule)...', 'thinking');

    const validQueue: string[] = [];
    for (const phone of phoneNumbers) {
      const digits = extractDigits(phone);
      if (digits.length < 10) {
        rejectedNumbers.push(phone);
        addLog('orchestrator', `REJECTED: ${phone} — only ${digits.length} digits (minimum 10)`, 'warning');
      } else if (digits.length > 15) {
        rejectedNumbers.push(phone);
        addLog('orchestrator', `REJECTED: ${phone} — ${digits.length} digits exceeds maximum 15`, 'warning');
      } else {
        validQueue.push(phone);
      }
    }

    if (rejectedNumbers.length > 0) {
      addLog('orchestrator', `Pre-validation: ${rejectedNumbers.length} number(s) rejected, ${validQueue.length} passed`, 'info');
    }

    // Deduplicate
    const uniqueNumbers = [...new Set(validQueue)];
    if (uniqueNumbers.length < validQueue.length) {
      addLog('orchestrator', `Removed ${validQueue.length - uniqueNumbers.length} duplicate(s). Processing ${uniqueNumbers.length} unique numbers.`, 'info');
    }

    if (uniqueNumbers.length === 0) {
      addLog('orchestrator', 'No valid numbers to process after pre-validation.', 'error');
      setIsProcessing(false);
      updateAgentStatus('orchestrator', 'error');
      return;
    }

    updateAgentStatus('orchestrator', 'complete');

    // Process each number through the agent pipeline
    for (let i = 0; i < uniqueNumbers.length; i++) {
      const phone = uniqueNumbers[i];
      setProgress({ total: uniqueNumbers.length, processed: i, currentNumber: phone });

      // Detect country code
      let countryCode = '+1';
      let numberPart = phone;
      if (phone.startsWith('+')) {
        const match = phone.match(/^\+(\d{1,3})/);
        if (match) {
          countryCode = `+${match[1]}`;
          numberPart = phone.slice(countryCode.length);
        }
      }

      addLog('orchestrator', `[${i + 1}/${uniqueNumbers.length}] Processing ${phone}`, 'info');

      try {
        updateAgentStatus('decision', 'active');
        updateAgentStatus('validation', 'active');
        updateAgentStatus('activity', 'active');
        updateAgentStatus('whatsapp', 'active');

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

        updateAgentStatus('decision', 'complete');
        updateAgentStatus('validation', 'complete');
        updateAgentStatus('activity', 'complete');
        updateAgentStatus('whatsapp', 'complete');
        updateAgentStatus('confidence', 'complete');

      } catch (err) {
        addLog('retry', `Failed to validate ${phone}: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        updateAgentStatus('retry', 'error');
      }

      setProgress({ total: uniqueNumbers.length, processed: i + 1, currentNumber: phone });

      // Rate limiting delay
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
    const avgTime = allResults.length > 0 ? Math.round(totalTime / allResults.length) : 0;
    const validCount = allResults.filter(r => r.isValid).length;
    const rate = allResults.length > 0 ? Math.round((validCount / allResults.length) * 1000) / 10 : 0;

    setStats({
      totalValidations: allResults.length,
      successRate: rate,
      avgResponseTime: avgTime,
      totalSaved: allResults.reduce((sum, r) => sum + r.costSaved, 0),
    });

    addLog('orchestrator', `Bulk validation complete. ${allResults.length} numbers processed in ${totalTime}ms`, 'success');
    if (rejectedNumbers.length > 0) {
      addLog('orchestrator', `Pre-validation rejected: ${rejectedNumbers.length} number(s)`, 'warning');
    }
    addLog('orchestrator', `WhatsApp Active: ${whatsappActive.length} | Not Active: ${whatsappNotActive.length}`, 'success');

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
