"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatasetStore } from "@/stores/dataset-store";
import { getEffectiveType } from "@/lib/parsing/type-detector";
import { COLUMN_TYPE_LABELS } from "@/lib/constants";
import type { ColumnType, ActiveFilter } from "@/types/data";

const CATEGORICAL_TYPES: ColumnType[] = ["categorical", "demographic", "likert_scale"];
const NUMERIC_TYPES: ColumnType[] = ["numeric", "percentage"];

export function FilterPanel() {
  const columns = useDatasetStore((s) => s.columns);
  const rows = useDatasetStore((s) => s.rows);
  const activeFilters = useDatasetStore((s) => s.activeFilters);
  const setFilter = useDatasetStore((s) => s.setFilter);
  const removeFilter = useDatasetStore((s) => s.removeFilter);
  const clearFilters = useDatasetStore((s) => s.clearFilters);
  const isLoaded = useDatasetStore((s) => s.isLoaded);

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // Derive the selected column's effective type
  const selectedColMeta = useMemo(() => {
    if (!selectedColumn) return null;
    return columns.find((c) => c.name === selectedColumn) ?? null;
  }, [columns, selectedColumn]);

  const selectedColType = useMemo(() => {
    if (!selectedColMeta) return null;
    return getEffectiveType(selectedColMeta);
  }, [selectedColMeta]);

  // Get unique values for categorical filter
  const uniqueValues = useMemo(() => {
    if (!selectedColumn || !selectedColType) return [];
    if (!CATEGORICAL_TYPES.includes(selectedColType)) return [];

    const values = new Set<string>();
    for (const row of rows) {
      const val = row[selectedColumn];
      if (val !== null && val !== undefined && val !== "") {
        values.add(String(val));
      }
    }
    return Array.from(values).sort();
  }, [rows, selectedColumn, selectedColType]);

  // Get min/max for numeric filter
  const numericRange = useMemo(() => {
    if (!selectedColumn || !selectedColType) return null;
    if (!NUMERIC_TYPES.includes(selectedColType)) return null;

    let min = Infinity;
    let max = -Infinity;
    for (const row of rows) {
      const num = Number(row[selectedColumn]);
      if (!isNaN(num)) {
        if (num < min) min = num;
        if (num > max) max = num;
      }
    }
    if (min === Infinity) return null;
    return { min, max };
  }, [rows, selectedColumn, selectedColType]);

  if (!isLoaded) return null;

  return (
    <Card className="bg-surface border-border">
      <CardHeader
        className="flex cursor-pointer flex-row items-center justify-between pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-accent-blue" />
          Filters
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilters.length} active
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Filters
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear All
                </Button>
              </div>
              <div className="space-y-1.5">
                {activeFilters.map((filter) => (
                  <ActiveFilterBadge
                    key={filter.column}
                    filter={filter}
                    onRemove={() => removeFilter(filter.column)}
                  />
                ))}
              </div>
              <Separator className="bg-border" />
            </div>
          )}

          {/* Add Filter */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Add Filter
            </p>

            {/* Column Selection */}
            <Select
              value={selectedColumn ?? ""}
              onValueChange={(value) => setSelectedColumn(value || null)}
            >
              <SelectTrigger className="bg-surface-raised border-border">
                <SelectValue placeholder="Select a column to filter" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => {
                  const type = getEffectiveType(col);
                  return (
                    <SelectItem key={col.name} value={col.name}>
                      <span className="flex items-center gap-2">
                        {col.name}
                        <span className="text-xs text-muted-foreground">
                          ({COLUMN_TYPE_LABELS[type]})
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Filter Value Input */}
            {selectedColumn && selectedColType && (
              <FilterValueInput
                column={selectedColumn}
                colType={selectedColType}
                uniqueValues={uniqueValues}
                numericRange={numericRange}
                onApply={(filter) => {
                  setFilter(filter);
                  setSelectedColumn(null);
                }}
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// -------------------------------------------------------------------
// Active filter badge
// -------------------------------------------------------------------
function ActiveFilterBadge({
  filter,
  onRemove,
}: {
  filter: ActiveFilter;
  onRemove: () => void;
}) {
  const displayValue = useMemo(() => {
    switch (filter.type) {
      case "in": {
        const vals = filter.value as string[];
        if (vals.length <= 2) return vals.join(", ");
        return `${vals[0]}, ${vals[1]} +${vals.length - 2} more`;
      }
      case "range": {
        const [min, max] = filter.value as [number, number];
        return `${min} -- ${max}`;
      }
      case "contains":
        return `contains "${filter.value}"`;
      case "equals":
        return `= "${filter.value}"`;
      default:
        return String(filter.value);
    }
  }, [filter]);

  return (
    <div className="flex items-center justify-between rounded-md bg-surface-raised px-3 py-2">
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground">
          {filter.column}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          {displayValue}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// -------------------------------------------------------------------
// Filter value input (adapts to column type)
// -------------------------------------------------------------------
function FilterValueInput({
  column,
  colType,
  uniqueValues,
  numericRange,
  onApply,
}: {
  column: string;
  colType: ColumnType;
  uniqueValues: string[];
  numericRange: { min: number; max: number } | null;
  onApply: (filter: ActiveFilter) => void;
}) {
  const isCategorical = CATEGORICAL_TYPES.includes(colType);
  const isNumeric = NUMERIC_TYPES.includes(colType);

  if (isCategorical) {
    return (
      <CategoricalFilter
        column={column}
        values={uniqueValues}
        onApply={onApply}
      />
    );
  }

  if (isNumeric) {
    return (
      <NumericFilter
        column={column}
        range={numericRange}
        onApply={onApply}
      />
    );
  }

  // Text / other
  return <TextFilter column={column} onApply={onApply} />;
}

// -------------------------------------------------------------------
// Categorical filter (multi-select checkboxes)
// -------------------------------------------------------------------
function CategoricalFilter({
  column,
  values,
  onApply,
}: {
  column: string;
  values: string[];
  onApply: (filter: ActiveFilter) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleValue = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    if (selected.size === 0) return;
    onApply({
      column,
      type: "in",
      value: Array.from(selected),
    });
  }, [column, selected, onApply]);

  return (
    <div className="space-y-2">
      <ScrollArea className="h-[180px] rounded-md border border-border bg-surface-raised p-2">
        <div className="space-y-1">
          {values.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No values found
            </p>
          ) : (
            values.map((value) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={selected.has(value)}
                  onChange={() => toggleValue(value)}
                  className="h-3.5 w-3.5 rounded border-border accent-accent-red"
                />
                <span className="truncate text-foreground">{value}</span>
              </label>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {selected.size} selected
        </span>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={selected.size === 0}
          className="h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Apply Filter
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Numeric filter (min/max range)
// -------------------------------------------------------------------
function NumericFilter({
  column,
  range,
  onApply,
}: {
  column: string;
  range: { min: number; max: number } | null;
  onApply: (filter: ActiveFilter) => void;
}) {
  const [minVal, setMinVal] = useState(range ? String(range.min) : "");
  const [maxVal, setMaxVal] = useState(range ? String(range.max) : "");

  const handleApply = useCallback(() => {
    const min = minVal !== "" ? Number(minVal) : -Infinity;
    const max = maxVal !== "" ? Number(maxVal) : Infinity;
    if (isNaN(min) || isNaN(max)) return;

    onApply({
      column,
      type: "range",
      value: [min, max],
    });
  }, [column, minVal, maxVal, onApply]);

  return (
    <div className="space-y-2">
      {range && (
        <p className="text-xs text-muted-foreground">
          Range: {range.min.toLocaleString()} -- {range.max.toLocaleString()}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Min</label>
          <Input
            type="number"
            placeholder="Min"
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
            className="h-8 bg-surface-raised border-border text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Max</label>
          <Input
            type="number"
            placeholder="Max"
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
            className="h-8 bg-surface-raised border-border text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleApply} className="h-7 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          Apply Filter
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Text filter (contains input)
// -------------------------------------------------------------------
function TextFilter({
  column,
  onApply,
}: {
  column: string;
  onApply: (filter: ActiveFilter) => void;
}) {
  const [text, setText] = useState("");

  const handleApply = useCallback(() => {
    if (!text.trim()) return;
    onApply({
      column,
      type: "contains",
      value: text.trim(),
    });
  }, [column, text, onApply]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleApply();
    },
    [handleApply]
  );

  return (
    <div className="space-y-2">
      <Input
        placeholder="Contains text..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 bg-surface-raised border-border text-sm"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!text.trim()}
          className="h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Apply Filter
        </Button>
      </div>
    </div>
  );
}
