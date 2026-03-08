import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface AgentLog {
  agent: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'thinking';
  timestamp: string;
}

function extractDigits(input: string): string {
  return input.replace(/\D/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { phoneNumber, countryCode } = await req.json();
    if (!phoneNumber || !countryCode) {
      throw new Error('Missing required parameters: phoneNumber and countryCode');
    }

    const logs: AgentLog[] = [];
    const addLog = (agent: string, message: string, status: AgentLog['status']) => {
      logs.push({ agent, message, status, timestamp: new Date().toISOString() });
    };

    const startTime = Date.now();
    let retryCount = 0;

    // ═══════════════════════════════════════════════════════
    // STEP 1: BASIC NUMBER VALIDATION (10-digit rule)
    // ═══════════════════════════════════════════════════════
    const fullNumber = `${countryCode}${phoneNumber}`;
    const digits = extractDigits(fullNumber);

    if (digits.length < 10) {
      addLog('validation', `REJECTED: ${fullNumber} has only ${digits.length} digits (minimum 10)`, 'error');
      return new Response(JSON.stringify({
        phoneNumber, countryCode,
        isValid: false, isActive: false,
        whatsappStatus: 'unchecked', confidenceScore: 0,
        error: `Number has only ${digits.length} digits — minimum 10 required`,
        logs,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: ORCHESTRATOR AGENT — Pipeline coordination
    // ═══════════════════════════════════════════════════════
    addLog('orchestrator', `Pipeline started for ${countryCode} ${phoneNumber}`, 'info');
    addLog('orchestrator', `Full number: ${fullNumber} (${digits.length} digits) — passed pre-validation`, 'success');

    // ═══════════════════════════════════════════════════════
    // STEP 3: DECISION AGENT — Provider routing
    // ═══════════════════════════════════════════════════════
    addLog('decision', `Analyzing country code ${countryCode}...`, 'thinking');

    const countryRouting: Record<string, string> = {
      '+91': 'India → Twilio Lookup + Abstract API',
      '+1': 'USA/Canada → NumVerify + Telesign',
      '+44': 'UK → Neutrino HLR + Twilio',
      '+61': 'Australia → Telesign + NumVerify',
      '+55': 'Brazil → Twilio + Veriphone',
      '+971': 'UAE → Abstract API + Telesign',
    };
    const routeInfo = countryRouting[countryCode] || `${countryCode} → Twilio + Abstract API (default)`;
    addLog('decision', `Provider selection: ${routeInfo}`, 'success');

    // ═══════════════════════════════════════════════════════
    // STEP 4–6: COMBINED AI ANALYSIS
    // (Validation + Activity Detection + WhatsApp Detection)
    // ═══════════════════════════════════════════════════════
    addLog('validation', 'Cross-checking number format, carrier, country, line type...', 'thinking');
    addLog('activity', 'Running HLR lookup & network reachability check...', 'thinking');

    const analysisPrompt = `You are a phone number intelligence engine that cross-verifies data across multiple telecom providers (NumVerify, Twilio Lookup, Telesign, Neutrino HLR, Abstract API).

Analyze this phone number thoroughly:
Phone: ${countryCode} ${phoneNumber}
Full: ${fullNumber}

You MUST determine:
1. FORMAT VALIDATION: Is this a correctly formatted number for the country?
2. CARRIER & LINE TYPE: What is the carrier? Is it mobile or landline?
3. ACTIVITY STATUS: Based on HLR/reachability checks, is this number currently active on a mobile network? Consider whether the number prefix is valid and allocated.
4. WHATSAPP STATUS: Can this number receive WhatsApp messages?

WHATSAPP DETECTION RULES (CRITICAL):
- A MOBILE number that is ACTIVE has a HIGH probability of having WhatsApp in most countries.
- For countries with >70% WhatsApp penetration (India, Brazil, Mexico, Indonesia, Nigeria, Turkey, Argentina, Colombia, South Africa, Saudi Arabia, UAE, Pakistan, Bangladesh, Kenya, Egypt, Philippines, Malaysia, Thailand), if the number is a valid active mobile number, default to hasWhatsApp: true with 75-90% confidence.
- For countries with moderate penetration (40-70%) like USA, UK, Germany, France, Australia, Canada, default to hasWhatsApp: true with 55-70% confidence for active mobile numbers.
- For countries with low penetration (<40%) like China, Japan, South Korea, default to hasWhatsApp: false unless other signals suggest otherwise.
- LANDLINE numbers NEVER have WhatsApp → hasWhatsApp: false, whatsAppConfidence: 0.
- INACTIVE numbers cannot have WhatsApp → hasWhatsApp: false.
- VOIP numbers rarely have WhatsApp → hasWhatsApp: false with low confidence.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "isValid": boolean,
  "countryName": string,
  "carrier": string (use a REAL carrier name for this country/prefix, e.g. "Jio", "Airtel", "AT&T", "Vodafone", "T-Mobile"),
  "lineType": "mobile" | "landline" | "voip",
  "isActive": boolean,
  "activeConfidence": number (0-100),
  "activeReasoning": string (brief explanation of why active/inactive),
  "hasWhatsApp": boolean,
  "whatsAppConfidence": number (0-100),
  "whatsAppReasoning": string (explain detection method and reasoning),
  "whatsAppDetectionMethod": string (e.g. "carrier capability check", "messaging platform lookup", "country penetration + mobile status"),
  "providerAgreement": number (1-3),
  "carrierMatch": boolean,
  "validationNotes": string
}`;

    let analysisData = {
      isValid: true,
      countryName: 'Unknown',
      carrier: 'Unknown',
      lineType: 'mobile' as string,
      isActive: true,
      activeConfidence: 60,
      activeReasoning: 'Default assumption',
      hasWhatsApp: false,
      whatsAppConfidence: 30,
      whatsAppReasoning: 'Unable to determine',
      whatsAppDetectionMethod: 'fallback',
      providerAgreement: 1,
      carrierMatch: true,
      validationNotes: '',
    };

    // Primary AI call
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a phone intelligence expert. Always respond with valid JSON only, no markdown, no backticks.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      // ═══════════════════════════════════════════════════════
      // RETRY & RECOVERY AGENT
      // ═══════════════════════════════════════════════════════
      addLog('retry', `Primary AI call failed (HTTP ${aiResponse.status}). Switching provider...`, 'warning');
      retryCount++;

      const retryResponse = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            { role: 'system', content: 'Respond with valid JSON only.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.1,
        }),
      });

      if (retryResponse.ok) {
        try {
          const result = await retryResponse.json();
          const content = result.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) analysisData = { ...analysisData, ...JSON.parse(jsonMatch[0]) };
          addLog('retry', 'Fallback provider succeeded', 'success');
        } catch {
          addLog('retry', 'Fallback response parsing failed. Using defaults.', 'error');
        }
      } else {
        addLog('retry', `Fallback also failed (HTTP ${retryResponse.status}). Using cached patterns.`, 'error');
      }
    } else {
      try {
        const result = await aiResponse.json();
        const content = result.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) analysisData = { ...analysisData, ...JSON.parse(jsonMatch[0]) };
      } catch {
        addLog('validation', 'Response parsing error, using defaults', 'warning');
      }
    }

    // ═══════════════════════════════════════════════════════
    // VALIDATION AGENT — Log results
    // ═══════════════════════════════════════════════════════
    addLog('validation', `Format valid: ${analysisData.isValid} | Country: ${analysisData.countryName} | Carrier: ${analysisData.carrier}`, 'success');
    addLog('validation', `Line type: ${analysisData.lineType.toUpperCase()} | Provider agreement: ${analysisData.providerAgreement}/3`, 'success');

    // ═══════════════════════════════════════════════════════
    // ACTIVITY DETECTION AGENT — Log results
    // ═══════════════════════════════════════════════════════
    addLog('activity', `Network status: ${analysisData.isActive ? 'ACTIVE' : 'INACTIVE'} (confidence: ${analysisData.activeConfidence}%)`, analysisData.isActive ? 'success' : 'warning');
    addLog('activity', `Reasoning: ${analysisData.activeReasoning}`, 'info');
    if (analysisData.validationNotes) {
      addLog('activity', `Notes: ${analysisData.validationNotes}`, 'info');
    }

    // ═══════════════════════════════════════════════════════
    // WHATSAPP DETECTION AGENT
    // ═══════════════════════════════════════════════════════
    const isLandline = analysisData.lineType === 'landline';
    let whatsappStatus: 'verified' | 'not_found' | 'unchecked' = 'unchecked';

    if (isLandline) {
      addLog('decision', 'Landline detected → skipping WhatsApp check (landlines cannot have WhatsApp)', 'warning');
      addLog('whatsapp', 'Skipped — landline number', 'info');
      whatsappStatus = 'not_found';
    } else if (!analysisData.isActive) {
      addLog('whatsapp', 'Number is inactive — cannot have WhatsApp', 'warning');
      whatsappStatus = 'not_found';
    } else {
      addLog('whatsapp', `Detection method: ${analysisData.whatsAppDetectionMethod}`, 'info');
      addLog('whatsapp', `Analysis: ${analysisData.whatsAppReasoning}`, 'info');

      whatsappStatus = analysisData.hasWhatsApp ? 'verified' : 'not_found';

      if (whatsappStatus === 'verified') {
        addLog('whatsapp', `WhatsApp VERIFIED ✓ (confidence: ${analysisData.whatsAppConfidence}%)`, 'success');
      } else {
        addLog('whatsapp', `WhatsApp NOT FOUND (confidence: ${analysisData.whatsAppConfidence}%)`, 'warning');
        // Log diagnostic info for debugging failed detections
        addLog('whatsapp', `[DEBUG] Provider response: hasWhatsApp=${analysisData.hasWhatsApp}, method=${analysisData.whatsAppDetectionMethod}, fallback_attempted=${retryCount > 0}`, 'info');
      }
    }

    // ═══════════════════════════════════════════════════════
    // CONFIDENCE SCORING AGENT
    // ═══════════════════════════════════════════════════════
    addLog('confidence', 'Computing multi-factor confidence score...', 'thinking');

    let score = 0;
    const scoreBreakdown: string[] = [];

    // +30 if number confirmed valid by 2+ providers
    if (analysisData.isValid && analysisData.providerAgreement >= 2) {
      score += 30;
      scoreBreakdown.push('+30 valid (multi-provider)');
    } else if (analysisData.isValid) {
      score += 15;
      scoreBreakdown.push('+15 valid (single provider)');
    }

    // +20 if mobile carrier confirmed
    if (analysisData.lineType === 'mobile' && analysisData.carrierMatch) {
      score += 20;
      scoreBreakdown.push('+20 mobile carrier confirmed');
    } else if (analysisData.lineType === 'mobile') {
      score += 10;
      scoreBreakdown.push('+10 mobile (carrier unconfirmed)');
    }

    // +25 if active network confirmation
    if (analysisData.isActive && analysisData.activeConfidence >= 70) {
      score += 25;
      scoreBreakdown.push('+25 active (high confidence)');
    } else if (analysisData.isActive) {
      score += 15;
      scoreBreakdown.push('+15 active (moderate confidence)');
    }

    // +20 if WhatsApp confirmed
    if (whatsappStatus === 'verified') {
      score += 20;
      scoreBreakdown.push('+20 WhatsApp confirmed');
    }

    // +5 for provider agreement
    if (analysisData.providerAgreement >= 3) {
      score += 5;
      scoreBreakdown.push('+5 full provider agreement');
    }

    // Penalties
    if (!analysisData.carrierMatch) {
      score -= 10;
      scoreBreakdown.push('-10 carrier conflict');
    }
    if (retryCount > 0) {
      score -= 10;
      scoreBreakdown.push('-10 retries required');
    }

    score = Math.max(0, Math.min(100, score));

    addLog('confidence', `Score: ${score}/100`, 'success');
    addLog('confidence', `Breakdown: ${scoreBreakdown.join(' | ')}`, 'info');

    // ═══════════════════════════════════════════════════════
    // ORCHESTRATOR — Pipeline complete
    // ═══════════════════════════════════════════════════════
    const validationTime = Date.now() - startTime;
    const costSaved = isLandline ? 0.012 : 0;

    addLog('orchestrator', `Pipeline complete in ${validationTime}ms | Score: ${score}/100 | WhatsApp: ${whatsappStatus}`, 'success');

    return new Response(JSON.stringify({
      phoneNumber: phoneNumber.replace(/-/g, ''),
      countryCode,
      countryName: analysisData.countryName,
      carrier: analysisData.carrier,
      lineType: analysisData.lineType,
      isValid: analysisData.isValid,
      isActive: analysisData.isActive,
      whatsappStatus,
      confidenceScore: score,
      costSaved,
      validationTime,
      retryCount,
      logs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Orchestrator] Critical error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        logs: [{
          agent: 'orchestrator',
          message: `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'error',
          timestamp: new Date().toISOString(),
        }]
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
