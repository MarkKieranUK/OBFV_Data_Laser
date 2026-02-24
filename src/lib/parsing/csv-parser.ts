import Papa from "papaparse";
import type { ParseResult } from "@/types/data";

export function parseCSV(fileContent: string): ParseResult {
  const result = Papa.parse<Record<string, unknown>>(fileContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const warnings: string[] = [];
  if (result.errors.length > 0) {
    for (const error of result.errors.slice(0, 10)) {
      warnings.push(`Row ${error.row}: ${error.message}`);
    }
    if (result.errors.length > 10) {
      warnings.push(`...and ${result.errors.length - 10} more warnings`);
    }
  }

  return {
    rows: result.data,
    headers: result.meta.fields ?? [],
    rowCount: result.data.length,
    parseWarnings: warnings,
  };
}
