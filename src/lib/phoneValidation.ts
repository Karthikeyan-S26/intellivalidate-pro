/**
 * Phone number validation utilities.
 * Enforces minimum 10-digit rule before any agent pipeline runs.
 */

export interface ParsedPhone {
  original: string;
  normalized: string;
  digitsOnly: string;
  isValid: boolean;
  error?: string;
}

/**
 * Extract only digits from a string.
 */
export function extractDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Validate a single phone number against the minimum 10-digit rule.
 * Returns a ParsedPhone object with validation status.
 */
export function validatePhoneNumber(raw: string): ParsedPhone {
  const trimmed = raw.trim();
  
  if (!trimmed) {
    return { original: raw, normalized: '', digitsOnly: '', isValid: false, error: 'Empty input' };
  }

  // Check for alphabetic characters (invalid)
  if (/[a-zA-Z]/.test(trimmed)) {
    return { original: raw, normalized: '', digitsOnly: '', isValid: false, error: 'Contains letters — not a valid phone number' };
  }

  const digits = extractDigits(trimmed);

  if (digits.length < 10) {
    return {
      original: raw,
      normalized: '',
      digitsOnly: digits,
      isValid: false,
      error: `Only ${digits.length} digits — minimum 10 required`,
    };
  }

  if (digits.length > 15) {
    return {
      original: raw,
      normalized: '',
      digitsOnly: digits,
      isValid: false,
      error: `${digits.length} digits — maximum 15 allowed`,
    };
  }

  // Normalize to international format
  const normalized = trimmed.startsWith('+') ? `+${digits}` : `+${digits}`;

  return {
    original: raw,
    normalized,
    digitsOnly: digits,
    isValid: true,
  };
}

/**
 * Parse a block of text and extract valid phone numbers.
 * Returns both valid and invalid numbers for user feedback.
 */
export function parsePhoneNumbers(text: string): {
  valid: string[];
  invalid: ParsedPhone[];
  duplicatesRemoved: number;
} {
  // Split by newlines, commas, semicolons, tabs
  const lines = text.split(/[\n,;\t]+/).map(l => l.trim()).filter(Boolean);
  
  const phoneRegex = /\+?[\d\s\-().]{7,25}/g;
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: ParsedPhone[] = [];
  let duplicatesRemoved = 0;

  for (const line of lines) {
    const matches = line.match(phoneRegex);
    if (matches) {
      for (const match of matches) {
        const parsed = validatePhoneNumber(match);
        
        if (parsed.isValid) {
          if (seen.has(parsed.normalized)) {
            duplicatesRemoved++;
          } else {
            seen.add(parsed.normalized);
            valid.push(parsed.normalized);
          }
        } else if (parsed.digitsOnly.length >= 3) {
          // Only report as invalid if it looks like it was meant to be a number
          invalid.push(parsed);
        }
      }
    } else {
      // Try the whole line as a number
      const parsed = validatePhoneNumber(line);
      if (parsed.isValid) {
        if (seen.has(parsed.normalized)) {
          duplicatesRemoved++;
        } else {
          seen.add(parsed.normalized);
          valid.push(parsed.normalized);
        }
      } else if (parsed.digitsOnly.length >= 3) {
        invalid.push(parsed);
      }
    }
  }

  return { valid, invalid, duplicatesRemoved };
}
