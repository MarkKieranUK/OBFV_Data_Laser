import { create } from "zustand";
import type { ColumnMeta, ColumnType, ActiveFilter } from "@/types/data";

interface DatasetState {
  fileName: string | null;
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
  rowCount: number;
  parseWarnings: string[];
  isLoaded: boolean;
  activeFilters: ActiveFilter[];

  setDataset: (data: {
    fileName: string;
    rows: Record<string, unknown>[];
    columns: ColumnMeta[];
    parseWarnings: string[];
  }) => void;
  overrideColumnType: (columnName: string, newType: ColumnType) => void;
  clearDataset: () => void;
  setFilter: (filter: ActiveFilter) => void;
  removeFilter: (column: string) => void;
  clearFilters: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  fileName: null,
  rows: [],
  columns: [],
  rowCount: 0,
  parseWarnings: [],
  isLoaded: false,
  activeFilters: [],

  setDataset: (data) =>
    set({
      fileName: data.fileName,
      rows: data.rows,
      columns: data.columns,
      rowCount: data.rows.length,
      parseWarnings: data.parseWarnings,
      isLoaded: true,
      activeFilters: [],
    }),

  overrideColumnType: (columnName, newType) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.name === columnName ? { ...col, overriddenType: newType } : col
      ),
    })),

  clearDataset: () =>
    set({
      fileName: null,
      rows: [],
      columns: [],
      rowCount: 0,
      parseWarnings: [],
      isLoaded: false,
      activeFilters: [],
    }),

  setFilter: (filter) =>
    set((state) => ({
      activeFilters: [
        ...state.activeFilters.filter((f) => f.column !== filter.column),
        filter,
      ],
    })),

  removeFilter: (column) =>
    set((state) => ({
      activeFilters: state.activeFilters.filter((f) => f.column !== column),
    })),

  clearFilters: () => set({ activeFilters: [] }),
}));
