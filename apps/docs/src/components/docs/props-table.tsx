import type { JSX, ReactNode } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * The field-by-field table that every reference page needs.
 *
 * `required` and `default` are separate columns rather than prose, because they
 * are the two things a reader scans for. A field with neither is optional and
 * stays `undefined` — which is stated once above the table instead of repeated
 * on every row.
 */

export type PropRow = {
  name: string
  type: string
  /** Marked in the first column. Mutually exclusive with `defaultValue`. */
  required?: boolean
  /** What the library fills in when you leave the field out. */
  defaultValue?: string
  /** Filled in by `createGalaxy()` from what you provided. */
  derived?: boolean
  description: ReactNode
}

export function PropsTable({ rows }: { rows: PropRow[] }): JSX.Element {
  return (
    // `whitespace-normal` on every cell, on purpose: shadcn's `TableCell` ships
    // `whitespace-nowrap`, which is right for a grid of values and wrong here —
    // a description is a sentence, and it must wrap rather than push the table
    // sideways.
    <div className="mt-6 overflow-x-auto rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[26%] whitespace-normal">Field</TableHead>
            <TableHead className="w-[28%] whitespace-normal">Type</TableHead>
            <TableHead className="whitespace-normal">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name} className="align-top">
              <TableCell className="py-3 whitespace-normal">
                <code className="font-mono text-[0.8rem] font-medium break-words">{row.name}</code>
                {row.required ? (
                  <span className="mt-1 block text-[0.7rem] text-destructive">required</span>
                ) : null}
                {row.derived ? (
                  <span className="mt-1 block text-[0.7rem] text-muted-foreground">derived</span>
                ) : null}
              </TableCell>
              <TableCell className="py-3 whitespace-normal">
                <code className="font-mono text-[0.8rem] break-words text-muted-foreground">
                  {row.type}
                </code>
                {row.defaultValue ? (
                  <span className="mt-1 block text-[0.7rem] break-words text-muted-foreground">
                    default <code className="font-mono">{row.defaultValue}</code>
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="py-3 text-sm leading-6 whitespace-normal text-muted-foreground">
                {row.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
