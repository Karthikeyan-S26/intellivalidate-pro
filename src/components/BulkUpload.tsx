import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, Plus, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { Textarea } from "@/components/ui/textarea";
import { parsePhoneNumbers, ParsedPhone } from "@/lib/phoneValidation";

interface BulkUploadProps {
  onValidate: (phoneNumbers: string[]) => void;
  isLoading: boolean;
}

export function BulkUpload({ onValidate, isLoading }: BulkUploadProps) {
  const [mode, setMode] = useState<'upload' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [parsedNumbers, setParsedNumbers] = useState<string[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<ParsedPhone[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = useCallback((text: string) => {
    setError(null);
    setInvalidNumbers([]);
    setDuplicatesRemoved(0);

    const result = parsePhoneNumbers(text);

    if (result.valid.length === 0 && result.invalid.length === 0) {
      setError('No phone numbers found. Enter numbers in international format (e.g., +919876543210).');
      return;
    }

    setInvalidNumbers(result.invalid);
    setDuplicatesRemoved(result.duplicatesRemoved);

    if (result.valid.length > 100) {
      setError(`Found ${result.valid.length} valid numbers. Maximum is 100 — only the first 100 will be used.`);
      setParsedNumbers(result.valid.slice(0, 100));
    } else {
      setParsedNumbers(result.valid);
    }

    if (result.valid.length === 0 && result.invalid.length > 0) {
      setError(`All ${result.invalid.length} number(s) failed validation. Numbers must have at least 10 digits.`);
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!['csv', 'txt', 'xlsx', 'pdf'].includes(ext || '')) {
      setError('Unsupported file format. Please upload CSV, TXT, XLSX, or PDF files.');
      return;
    }

    try {
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        handleParse(text);
      } else {
        setError(`For ${ext?.toUpperCase()} files, please copy and paste numbers directly. Client-side parsing is limited to CSV and TXT.`);
      }
    } catch {
      setError('Failed to read file. Please try again.');
    }
  }, [handleParse]);

  const handleManualParse = useCallback(() => {
    handleParse(manualInput);
  }, [manualInput, handleParse]);

  const removeNumber = (index: number) => {
    setParsedNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (parsedNumbers.length > 0) {
      onValidate(parsedNumbers);
    }
  };

  const handleClear = () => {
    setParsedNumbers([]);
    setInvalidNumbers([]);
    setDuplicatesRemoved(0);
    setManualInput('');
    setFileName(null);
    setError(null);
  };

  return (
    <GlowCard className="max-w-4xl mx-auto" variant="gradient">
      <div className="space-y-6">
        {/* Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('manual')}
            className={cn(
              "flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              mode === 'manual'
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/30 text-muted-foreground border border-border hover:border-primary/30"
            )}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Manual Input
          </button>
          <button
            onClick={() => setMode('upload')}
            className={cn(
              "flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              mode === 'upload'
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/30 text-muted-foreground border border-border hover:border-primary/30"
            )}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            File Upload
          </button>
        </div>

        {/* Manual Input */}
        {mode === 'manual' && (
          <div className="space-y-3">
            <Textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={`Enter phone numbers (one per line or comma-separated)\n\nExamples:\n+919876543210\n+14155552671\n+447911123456\n9876543210`}
              className="min-h-[160px] font-mono text-sm bg-background/50 border-border"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Max 100 numbers • Minimum 10 digits each • International format preferred
              </p>
              <Button onClick={handleManualParse} variant="secondary" size="sm" disabled={!manualInput.trim()}>
                Parse Numbers
              </Button>
            </div>
          </div>
        )}

        {/* File Upload */}
        {mode === 'upload' && (
          <div className="space-y-3">
            <label
              className={cn(
                "flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed cursor-pointer transition-all",
                "border-border bg-background/30 hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                {fileName ? (
                  <>
                    <FileText className="w-8 h-8 text-primary" />
                    <span className="text-sm font-medium text-foreground">{fileName}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">Drop file here or click to browse</span>
                    <span className="text-xs">Supports CSV, TXT (max 100 numbers)</span>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv,.txt,.xlsx,.pdf"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Invalid Numbers Feedback */}
        {invalidNumbers.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
            <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {invalidNumbers.length} number(s) rejected (less than 10 digits):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {invalidNumbers.map((n, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-mono" title={n.error}>
                  {n.original} — {n.error}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dedup Info */}
        {duplicatesRemoved > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {duplicatesRemoved} duplicate(s) removed automatically.
          </div>
        )}

        {/* Parsed Numbers Preview */}
        {parsedNumbers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">
                {parsedNumbers.length} valid number{parsedNumbers.length !== 1 ? 's' : ''} ready for validation
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground"
              >
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 rounded-lg bg-background/50 border border-border">
              {parsedNumbers.map((num, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-mono text-primary"
                >
                  {num}
                  <button onClick={() => removeNumber(i)} className="hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={parsedNumbers.length === 0 || isLoading}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold hover:shadow-glow-md transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating {parsedNumbers.length} numbers...
            </>
          ) : (
            <>
              Validate {parsedNumbers.length > 0 ? `${parsedNumbers.length} Numbers` : 'Numbers'}
            </>
          )}
        </Button>
      </div>
    </GlowCard>
  );
}
