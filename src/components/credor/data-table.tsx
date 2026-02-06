"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onSort?: (key: string) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  onSort,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>
                {col.sortable && onSort ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8"
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, idx) => (
              <TableRow key={(item.id as string) ?? idx}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render
                      ? col.render(item)
                      : (item[col.key] as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
