"use client";

import { useState, useCallback } from "react";
import { parseCSV } from "@/lib/parsing/csv-parser";
import { parseExcel } from "@/lib/parsing/excel-parser";
import { detectColumnTypes } from "@/lib/parsing/type-detector";
import { useDatasetStore } from "@/stores/dataset-store";
import { MAX_FILE_SIZE_MB, WARN_FILE_SIZE_MB } from "@/lib/constants";
import type { ColumnMeta, ParseResult } from "@/types/data";

interface UploadState {
  isLoading: boolean;
  error: string | null;
  warning: string | null;
  previewData: {
    parseResult: ParseResult;
    columns: ColumnMeta[];
    fileName: string;
  } | null;
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    isLoading: false,
    error: null,
    warning: null,
    previewData: null,
  });

  const setDataset = useDatasetStore((s) => s.setDataset);

  const processFile = useCallback(async (file: File) => {
    setState({ isLoading: true, error: null, warning: null, previewData: null });

    const ext = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setState({
        isLoading: false,
        error: `Unsupported file type: ${ext}. Please upload a CSV or Excel file.`,
        warning: null,
        previewData: null,
      });
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setState({
        isLoading: false,
        error: `File too large (${sizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
        warning: null,
        previewData: null,
      });
      return;
    }

    let warning: string | null = null;
    if (sizeMB > WARN_FILE_SIZE_MB) {
      warning = `Large file (${sizeMB.toFixed(1)}MB). Parsing may take a moment.`;
    }

    try {
      let parseResult: ParseResult;

      if (ext === ".csv") {
        const text = await file.text();
        parseResult = parseCSV(text);
      } else {
        const buffer = await file.arrayBuffer();
        parseResult = parseExcel(buffer);
      }

      if (parseResult.rows.length === 0) {
        setState({
          isLoading: false,
          error: "File appears to be empty or could not be parsed.",
          warning: null,
          previewData: null,
        });
        return;
      }

      const columns = detectColumnTypes(parseResult);

      setState({
        isLoading: false,
        error: null,
        warning,
        previewData: {
          parseResult,
          columns,
          fileName: file.name,
        },
      });
    } catch (err) {
      setState({
        isLoading: false,
        error: `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
        warning: null,
        previewData: null,
      });
    }
  }, []);

  const confirmUpload = useCallback(() => {
    if (!state.previewData) return;
    const { parseResult, columns, fileName } = state.previewData;
    setDataset({
      fileName,
      rows: parseResult.rows,
      columns,
      parseWarnings: parseResult.parseWarnings,
    });
    setState({ isLoading: false, error: null, warning: null, previewData: null });
  }, [state.previewData, setDataset]);

  const clearPreview = useCallback(() => {
    setState({ isLoading: false, error: null, warning: null, previewData: null });
  }, []);

  return {
    ...state,
    processFile,
    confirmUpload,
    clearPreview,
  };
}
