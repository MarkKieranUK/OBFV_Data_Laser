import * as XLSX from "xlsx";
import type { ParseResult } from "@/types/data";

export function parseExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      headers: [],
      rowCount: 0,
      parseWarnings: ["No sheets found in workbook"],
    };
  }

  if (workbook.SheetNames.length > 1) {
    warnings.push(
      `Workbook contains ${workbook.SheetNames.length} sheets. Using first sheet: "${sheetName}"`
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!, {
    defval: null,
  });

  const headers =
    rows.length > 0
      ? Object.keys(rows[0]!).map((h) => h.trim())
      : [];

  return {
    rows,
    headers,
    rowCount: rows.length,
    parseWarnings: warnings,
  };
}
