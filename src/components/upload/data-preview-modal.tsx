"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatasetStore } from "@/stores/dataset-store";
import { COLUMN_TYPE_LABELS, COLUMN_TYPE_COLORS } from "@/lib/constants";
import type { ColumnMeta, ColumnType, ParseResult } from "@/types/data";

interface DataPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  parseResult: ParseResult;
  columns: ColumnMeta[];
  fileName: string;
}

const ALL_COLUMN_TYPES: ColumnType[] = [
  "numeric",
  "categorical",
  "date",
  "text",
  "percentage",
  "likert_scale",
  "demographic",
];

export function DataPreviewModal({
  open,
  onClose,
  onConfirm,
  parseResult,
  columns,
  fileName,
}: DataPreviewModalProps) {
  const overrideColumnType = useDatasetStore((s) => s.overrideColumnType);
  const previewRows = parseResult.rows.slice(0, 10);
  const missingTotal = columns.reduce((sum, c) => sum + c.missingCount, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Preview: {fileName}
          </DialogTitle>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{parseResult.rowCount.toLocaleString()} rows</span>
            <span>{columns.length} columns</span>
            {missingTotal > 0 && (
              <span className="text-warning">
                {missingTotal.toLocaleString()} missing values
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Column Types */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Detected Column Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <div
                  key={col.name}
                  className="flex items-center gap-1.5 rounded-md bg-surface-raised px-2.5 py-1.5"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        COLUMN_TYPE_COLORS[col.overriddenType ?? col.detectedType],
                    }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {col.name}
                  </span>
                  <Select
                    value={col.overriddenType ?? col.detectedType}
                    onValueChange={(val) =>
                      overrideColumnType(col.name, val as ColumnType)
                    }
                  >
                    <SelectTrigger className="h-6 w-auto min-w-[100px] border-none bg-transparent px-1 text-xs text-muted-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_COLUMN_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="text-xs">
                          {COLUMN_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {col.missingPercent > 5 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-warning border-warning/30"
                    >
                      {col.missingPercent.toFixed(0)}% missing
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview Table */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Data Preview (first 10 rows)
            </h3>
            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead
                        key={col.name}
                        className="whitespace-nowrap text-xs"
                      >
                        {col.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell
                          key={col.name}
                          className="max-w-[200px] truncate text-xs"
                        >
                          {row[col.name] === null || row[col.name] === undefined
                            ? "—"
                            : String(row[col.name])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Parse Warnings */}
          {parseResult.parseWarnings.length > 0 && (
            <div className="rounded-md bg-warning/10 p-3">
              <p className="mb-1 text-xs font-medium text-warning">
                Parse Warnings
              </p>
              {parseResult.parseWarnings.map((w, i) => (
                <p key={i} className="text-xs text-warning/80">
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm &amp; Analyze</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
