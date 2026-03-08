import { ValidationResult } from "@/types/validation";

function resultToRow(r: ValidationResult) {
  return [
    r.countryCode + r.phoneNumber,
    r.countryName,
    r.carrier,
    r.lineType,
    r.isValid ? "Yes" : "No",
    r.isActive ? "Yes" : "No",
    r.whatsappStatus === "verified" ? "Yes" : "No",
    r.confidenceScore.toString(),
  ];
}

const HEADERS = ["Phone", "Country", "Carrier", "Line Type", "Valid", "Active", "WhatsApp", "Confidence"];

function toCSV(rows: string[][]): string {
  return [HEADERS, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(whatsappActive: ValidationResult[], whatsappNotActive: ValidationResult[]) {
  const activeRows = whatsappActive.map(resultToRow);
  const inactiveRows = whatsappNotActive.map(resultToRow);
  const allRows = [...activeRows, ...inactiveRows];
  download(toCSV(allRows), "validation-results-all.csv", "text/csv");
}

export function exportWhatsAppActiveCSV(results: ValidationResult[]) {
  download(toCSV(results.map(resultToRow)), "whatsapp-active.csv", "text/csv");
}

export function exportWhatsAppNotActiveCSV(results: ValidationResult[]) {
  download(toCSV(results.map(resultToRow)), "whatsapp-not-active.csv", "text/csv");
}
