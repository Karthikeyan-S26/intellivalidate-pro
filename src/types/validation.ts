export interface AgentLog {
  id: string;
  timestamp: Date;
  agent: AgentType;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'thinking';
}

export type AgentType = 
  | 'orchestrator' 
  | 'validation' 
  | 'decision' 
  | 'retry' 
  | 'whatsapp' 
  | 'confidence'
  | 'activity';

export interface AgentStatus {
  name: AgentType;
  displayName: string;
  status: 'idle' | 'active' | 'complete' | 'error';
  icon: string;
}

export interface ValidationResult {
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  carrier: string;
  lineType: 'mobile' | 'landline' | 'voip' | 'unknown';
  isValid: boolean;
  isActive: boolean;
  whatsappStatus: 'verified' | 'not_found' | 'unchecked' | 'checking';
  confidenceScore: number;
  costSaved: number;
  validationTime: number;
  retryCount: number;
}

export interface BulkValidationResult {
  results: ValidationResult[];
  whatsappActive: ValidationResult[];
  whatsappNotActive: ValidationResult[];
  totalProcessed: number;
  totalValid: number;
  totalActive: number;
  totalWhatsApp: number;
  totalTime: number;
}

export interface ValidationRequest {
  phoneNumber: string;
  countryCode: string;
}

export interface BulkValidationRequest {
  phoneNumbers: string[];
}
