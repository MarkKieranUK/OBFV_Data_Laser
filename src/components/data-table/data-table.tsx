"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatasetStore } from "@/stores/dataset-store";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { getEffectiveType } from "@/lib/parsing/type-detector";
import { COLUMN_TYPE_LABELS, COLUMN_TYPE_COLORS } from "@/lib/constants";

const PAGE_SIZE = 25;

type RowData = Record<string, unknown>;

export function DataTable() {
  const columns = useDatasetStore((s) => s.columns);
  const isLoaded = useDatasetStore((s) => s.isLoaded);
  const activeFilters = useDatasetStore((s) => s.activeFilters);
  const { filteredRows, totalRows, filteredCount } = useFilteredData();

  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo<ColumnDef<RowData, unknown>[]>(() => {
    return columns.map((col) => {
      const effectiveType = getEffectiveType(col);
      const typeColor = COLUMN_TYPE_COLORS[effectiveType];

      return {
        id: col.name,
        accessorFn: (row: RowData) => row[col.name],
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1.5 text-left font-medium hover:text-foreground"
              onClick={() => column.toggleSorting()}
            >
              <span className="truncate">{col.name}</span>
              {sorted === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 shrink-0 text-accent-red" />
              ) : sorted === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5 shrink-0 text-accent-red" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
              )}
            </button>
          );
        },
        cell: ({ getValue }) => {
          const val = getValue();
          if (val === null || val === undefined || val === "") {
            return (
              <span className="italic text-muted-foreground/50">--</span>
            );
          }
          return (
            <span className="truncate">{String(val)}</span>
          );
        },
        size: 160,
      } satisfies ColumnDef<RowData, unknown>;
    });
  }, [columns]);

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: PAGE_SIZE },
    },
  });

  if (!isLoaded) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Load a dataset to view the data table
          </p>
        </CardContent>
      </Card>
    );
  }

  if (columns.length === 0) {
    return (
      <Card className="bg-surface border-border">
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No columns found in this dataset
          </p>
        </CardContent>
      </Card>
    );
  }

  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const isFiltered = activeFilters.length > 0;

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isFiltered ? (
            <>
              <span>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {filteredCount.toLocaleString()}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalRows.toLocaleString()}
                </span>{" "}
                rows
              </span>
              <Badge variant="secondary" className="text-xs">
                filtered
              </Badge>
            </>
          ) : (
            <span>
              <span className="font-medium text-foreground">
                {totalRows.toLocaleString()}
              </span>{" "}
              rows
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Page {pageIndex + 1} of {pageCount || 1}
          </span>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-surface border-border overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="whitespace-nowrap bg-surface-raised text-xs text-muted-foreground"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No rows match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-border hover:bg-surface-raised/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="max-w-[200px] truncate text-sm"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing rows{" "}
          {filteredCount === 0
            ? "0"
            : `${pageIndex * PAGE_SIZE + 1}--${Math.min(
                (pageIndex + 1) * PAGE_SIZE,
                filteredCount
              )}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
