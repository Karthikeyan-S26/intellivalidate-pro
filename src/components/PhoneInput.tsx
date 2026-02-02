import { useState } from "react";
import { cn } from "@/lib/utils";
import { Phone, Search, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhoneInputProps {
  onValidate: (phoneNumber: string, countryCode: string) => void;
  isLoading: boolean;
}

const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
];

export function PhoneInput({ onValidate, isLoading }: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim()) {
      onValidate(phoneNumber, selectedCountry.code);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex flex-col sm:flex-row gap-3">
        {/* Country Code Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border bg-card",
              "hover:border-primary/50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              showDropdown && "border-primary ring-2 ring-primary/50"
            )}
          >
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="font-mono text-sm">{selectedCountry.code}</span>
            <Globe className="w-4 h-4 text-muted-foreground ml-1" />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 py-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {countryCodes.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors",
                    selectedCountry.code === country.code && "bg-primary/10"
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="font-mono text-sm">{country.code}</span>
                  <span className="text-sm text-muted-foreground">{country.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            placeholder="Enter phone number..."
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-lg border bg-card font-mono text-lg",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-all duration-200"
            )}
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!phoneNumber.trim() || isLoading}
          className={cn(
            "px-8 py-3 bg-primary text-primary-foreground font-semibold",
            "hover:shadow-glow-md transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Validate
            </>
          )}
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground text-center">
        Enter a phone number to initiate the multi-agent validation pipeline
      </p>
    </form>
  );
}
