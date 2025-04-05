'use client';

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import Link from "next/link";

export type ApiKeyData = {
  key_id: string;
  name: string;
  last_used_at: string;
  call_count: number;
};

export const columns: ColumnDef<ApiKeyData>[] = [
  {
    id: "index",
    header: "Index",
    cell: ({ row }) => {
      return <div className="font-medium text-center">{row.index + 1}</div>;
    },
  },
  {
    accessorKey: "name",
    header: "API Key Name(ID)",
    cell: ({ row }) => {
      return (
        <Link 
          href={`/my/usage/${row.original.key_id}`}
          className="font-medium hover:text-blue-400 transition-colors"
        >
          <span className="text-gray-400">{row.original.name}</span> ({row.original.key_id})
        </Link>
      );
    },
  },
  {
    accessorKey: "last_used_at",
    header: "Last use",
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.last_used_at || 'Never'}</div>;
    },
  },
  {
    accessorKey: "call_count",
    header: "Calls",
    cell: ({ row }) => {
      return <div className="text-right font-medium">{row.original.call_count.toLocaleString()}</div>;
    },
  },
];

export function UsageTable() {
  const [data, setData] = useState<ApiKeyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch('https://hashkey.sungwoonsong.com/api-keys/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch API keys');
        }

        const apiKeys = await response.json();
        setData(apiKeys);
      } catch (error) {
        console.error('Error fetching API keys:', error);
        setError('Failed to fetch API keys. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKeys();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading API keys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-700">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-gray-700">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className="text-white">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="bg-gray-800 text-white hover:bg-gray-700"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-4">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-white"
              >
                No API keys found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 