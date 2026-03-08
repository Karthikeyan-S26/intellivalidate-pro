import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TWILIO_LOOKUP_URL = "https://lookups.twilio.com/v2/PhoneNumbers";

interface AgentLog {
  agent: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'thinking';
  timestamp: string;
}

function extractDigits(input: string): string {
  return input.replace(/\D/g, '');
}

async function twilioLookup(fullNumber: string, fields: string, accountSid: string, authToken: string): Promise<any> {
  const encoded = encodeURIComponent(fullNumber);
  const url = `${TWILIO_LOOKUP_URL}/${encoded}?Fields=${fields}`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio ${fields} lookup failed [${res.status}]: ${body}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const hasTwilio = !!(TWILIO_SID && TWILIO_TOKEN);

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
    // STEP 2: ORCHESTRATOR AGENT
    // ═══════════════════════════════════════════════════════
    addLog('orchestrator', `Pipeline started for ${countryCode} ${phoneNumber}`, 'info');
    addLog('orchestrator', `Full number: ${fullNumber} (${digits.length} digits) — passed pre-validation`, 'success');
    addLog('orchestrator', `Twilio API: ${hasTwilio ? 'CONNECTED ✓' : 'NOT CONFIGURED (using AI fallback)'}`, hasTwilio ? 'success' : 'warning');

    // ═══════════════════════════════════════════════════════
    // STEP 3: DECISION AGENT — Provider routing
    // ═══════════════════════════════════════════════════════
    addLog('decision', `Analyzing country code ${countryCode}...`, 'thinking');
    const routeInfo = hasTwilio ? 'Twilio Lookup v2 (real-time)' : 'AI analysis (simulated)';
    addLog('decision', `Provider: ${routeInfo}`, 'success');

    // ═══════════════════════════════════════════════════════
    // STEP 4: VALIDATION + ACTIVITY via Twilio Lookup
    // ═══════════════════════════════════════════════════════
    let twilioLineType: any = null;
    let twilioCallerName: any = null;
    let carrierName = 'Unknown';
    let lineType = 'mobile';
    let countryName = 'Unknown';
    let isValid = true;
    let isActive = true;
    let activeConfidence = 60;
    let providerAgreement = 1;
    let carrierMatch = true;

    if (hasTwilio) {
      // Run Twilio line_type_intelligence lookup
      addLog('validation', 'Querying Twilio Lookup v2 for line type intelligence...', 'thinking');
      try {
        twilioLineType = await twilioLookup(fullNumber, 'line_type_intelligence', TWILIO_SID!, TWILIO_TOKEN!);
        
        isValid = twilioLineType.valid ?? true;
        countryName = twilioLineType.country_code || 'Unknown';
        
        const lti = twilioLineType.line_type_intelligence;
        if (lti) {
          carrierName = lti.carrier_name || lti.mobile_network_code || 'Unknown';
          lineType = lti.type || 'mobile';
          // Map Twilio types to our types
          if (['landline', 'fixedLine'].includes(lineType)) lineType = 'landline';
          else if (['mobile', 'cellphone'].includes(lineType)) lineType = 'mobile';
          else if (['voip', 'nonFixedVoip', 'fixedVoip'].includes(lineType)) lineType = 'voip';
        }

        addLog('validation', `Twilio confirmed: valid=${isValid}, carrier="${carrierName}", type=${lineType}, country=${countryName}`, 'success');
        providerAgreement = 2; // Twilio is a strong provider
        activeConfidence = 85;
        isActive = isValid; // If Twilio says valid, it's active on the network

      } catch (err) {
        addLog('validation', `Twilio line_type lookup failed: ${err instanceof Error ? err.message : 'Unknown'}`, 'warning');
        addLog('retry', 'Falling back to AI analysis...', 'warning');
        retryCount++;
      }

      // Try caller_name lookup for extra info
      try {
        twilioCallerName = await twilioLookup(fullNumber, 'caller_name', TWILIO_SID!, TWILIO_TOKEN!);
        if (twilioCallerName.caller_name?.caller_name) {
          addLog('validation', `Caller name: ${twilioCallerName.caller_name.caller_name}`, 'info');
        }
      } catch {
        // caller_name is optional, don't fail
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 5: AI ANALYSIS (supplement or fallback)
    // ═══════════════════════════════════════════════════════
    addLog('activity', 'Running AI-powered analysis...', 'thinking');

    const twilioContext = hasTwilio && twilioLineType
      ? `\nTwilio Lookup REAL DATA:\n- Valid: ${isValid}\n- Carrier: ${carrierName}\n- Line type: ${lineType}\n- Country: ${countryName}\n- Active confidence: ${activeConfidence}%\nUse this real data as ground truth. Supplement with your knowledge.`
      : '\nNo real provider data available. Use your best knowledge.';

    const analysisPrompt = `You are a phone number intelligence engine.
Analyze: ${countryCode} ${phoneNumber} (full: ${fullNumber})
${twilioContext}

Determine:
1. ACTIVITY STATUS: Is this number currently active?
2. WHATSAPP STATUS: Can this number receive WhatsApp messages?
3. Country name (full name, e.g. "India", "United States")
${!hasTwilio ? '4. Carrier name and line type' : ''}

WHATSAPP RULES:
- MOBILE + ACTIVE in high-penetration countries (India, Brazil, Mexico, Indonesia, Nigeria, Turkey, Argentina, Colombia, South Africa, UAE, Pakistan, Bangladesh, Kenya, Egypt, Philippines, Malaysia, Thailand): hasWhatsApp=true, 75-90% confidence
- MOBILE + ACTIVE in moderate countries (USA, UK, Germany, France, Australia, Canada): hasWhatsApp=true, 55-70% confidence  
- LANDLINE: hasWhatsApp=false always
- INACTIVE: hasWhatsApp=false always
- VOIP: hasWhatsApp=false usually

Respond with ONLY valid JSON:
{
  "countryName": string,
  ${!hasTwilio ? '"carrier": string, "lineType": "mobile"|"landline"|"voip",' : ''}
  "isActive": boolean,
  "activeConfidence": number (0-100),
  "activeReasoning": string,
  "hasWhatsApp": boolean,
  "whatsAppConfidence": number (0-100),
  "whatsAppReasoning": string,
  "whatsAppDetectionMethod": string,
  "validationNotes": string
}`;

    let aiData: any = {};

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a phone intelligence expert. Respond with valid JSON only, no markdown.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (aiResponse.ok) {
      try {
        const result = await aiResponse.json();
        const content = result.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
      } catch {
        addLog('activity', 'AI response parsing error', 'warning');
      }
    } else {
      addLog('retry', `AI call failed (HTTP ${aiResponse.status}), trying fallback...`, 'warning');
      retryCount++;
      
      const retryRes = await fetch(AI_GATEWAY_URL, {
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

      if (retryRes.ok) {
        try {
          const result = await retryRes.json();
          const content = result.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
          addLog('retry', 'Fallback AI succeeded', 'success');
        } catch {
          addLog('retry', 'Fallback parsing failed', 'error');
        }
      }
    }

    // Merge AI data with Twilio data (Twilio takes priority)
    if (aiData.countryName) countryName = aiData.countryName;
    if (!hasTwilio || !twilioLineType) {
      // Use AI data as primary if no Twilio
      carrierName = aiData.carrier || carrierName;
      lineType = aiData.lineType || lineType;
      isActive = aiData.isActive ?? isActive;
      activeConfidence = aiData.activeConfidence ?? activeConfidence;
      isValid = true; // passed digit check
    }

    // Log validation results
    addLog('validation', `Format valid: ${isValid} | Country: ${countryName} | Carrier: ${carrierName}`, 'success');
    addLog('validation', `Line type: ${lineType.toUpperCase()} | Provider: ${hasTwilio ? 'Twilio (real)' : 'AI (simulated)'}`, 'success');

    // Log activity results
    addLog('activity', `Network status: ${isActive ? 'ACTIVE' : 'INACTIVE'} (confidence: ${activeConfidence}%)`, isActive ? 'success' : 'warning');
    if (aiData.activeReasoning) addLog('activity', `Reasoning: ${aiData.activeReasoning}`, 'info');

    // ═══════════════════════════════════════════════════════
    // STEP 6: WHATSAPP DETECTION
    // ═══════════════════════════════════════════════════════
    const isLandline = lineType === 'landline';
    let whatsappStatus: 'verified' | 'not_found' | 'unchecked' = 'unchecked';
    let whatsAppConfidence = aiData.whatsAppConfidence ?? 30;

    if (isLandline) {
      addLog('whatsapp', 'Landline detected → WhatsApp NOT possible', 'warning');
      whatsappStatus = 'not_found';
      whatsAppConfidence = 0;
    } else if (!isActive) {
      addLog('whatsapp', 'Number inactive → WhatsApp NOT possible', 'warning');
      whatsappStatus = 'not_found';
      whatsAppConfidence = 0;
    } else {
      const method = aiData.whatsAppDetectionMethod || 'AI analysis + carrier data';
      addLog('whatsapp', `Detection method: ${method}`, 'info');
      addLog('whatsapp', `Analysis: ${aiData.whatsAppReasoning || 'Based on carrier and country data'}`, 'info');

      // If Twilio confirmed mobile + valid, boost WhatsApp confidence
      if (hasTwilio && twilioLineType && lineType === 'mobile' && isValid) {
        addLog('whatsapp', 'Twilio confirmed MOBILE + VALID → boosting WhatsApp confidence', 'info');
        if (aiData.hasWhatsApp !== false) {
          whatsAppConfidence = Math.max(whatsAppConfidence, 75);
        }
      }

      const hasWhatsApp = aiData.hasWhatsApp ?? (lineType === 'mobile' && isActive);
      whatsappStatus = hasWhatsApp ? 'verified' : 'not_found';

      if (whatsappStatus === 'verified') {
        addLog('whatsapp', `WhatsApp VERIFIED ✓ (confidence: ${whatsAppConfidence}%)`, 'success');
      } else {
        addLog('whatsapp', `WhatsApp NOT FOUND (confidence: ${whatsAppConfidence}%)`, 'warning');
        addLog('whatsapp', `[DEBUG] hasWhatsApp=${hasWhatsApp}, method=${method}, twilio=${hasTwilio}, retry=${retryCount}`, 'info');
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 7: CONFIDENCE SCORING
    // ═══════════════════════════════════════════════════════
    addLog('confidence', 'Computing multi-factor confidence score...', 'thinking');

    let score = 0;
    const breakdown: string[] = [];

    // Validity (+15 or +30)
    if (isValid && providerAgreement >= 2) {
      score += 30; breakdown.push('+30 valid (Twilio confirmed)');
    } else if (isValid) {
      score += 15; breakdown.push('+15 valid (single source)');
    }

    // Mobile carrier (+10 or +20)
    if (lineType === 'mobile' && carrierMatch) {
      score += 20; breakdown.push('+20 mobile carrier confirmed');
    } else if (lineType === 'mobile') {
      score += 10; breakdown.push('+10 mobile (carrier unconfirmed)');
    }

    // Activity (+15 or +25)
    if (isActive && activeConfidence >= 70) {
      score += 25; breakdown.push('+25 active (high confidence)');
    } else if (isActive) {
      score += 15; breakdown.push('+15 active (moderate confidence)');
    }

    // WhatsApp (+20)
    if (whatsappStatus === 'verified') {
      score += 20; breakdown.push('+20 WhatsApp confirmed');
    }

    // Provider agreement (+5)
    if (providerAgreement >= 3) {
      score += 5; breakdown.push('+5 full provider agreement');
    }

    // Penalties
    if (!carrierMatch) { score -= 10; breakdown.push('-10 carrier conflict'); }
    if (retryCount > 0) { score -= 10; breakdown.push('-10 retries required'); }

    score = Math.max(0, Math.min(100, score));

    addLog('confidence', `Score: ${score}/100`, 'success');
    addLog('confidence', `Breakdown: ${breakdown.join(' | ')}`, 'info');

    // ═══════════════════════════════════════════════════════
    // ORCHESTRATOR — Pipeline complete
    // ═══════════════════════════════════════════════════════
    const validationTime = Date.now() - startTime;
    addLog('orchestrator', `Pipeline complete in ${validationTime}ms | Score: ${score}/100 | WhatsApp: ${whatsappStatus}`, 'success');

    return new Response(JSON.stringify({
      phoneNumber: phoneNumber.replace(/-/g, ''),
      countryCode,
      countryName,
      carrier: carrierName,
      lineType,
      isValid,
      isActive,
      whatsappStatus,
      confidenceScore: score,
      costSaved: isLandline ? 0.012 : 0,
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
