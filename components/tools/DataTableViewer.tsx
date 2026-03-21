/**
 * @file DataTableViewer.tsx
 * @description Renders extracted structured data as a responsive table with CSV export.
 */

"use client";

import { Download } from "lucide-react";

interface DataTableViewerProps {
  hasData: boolean;
  title?: string;
  description?: string;
  columns?: Array<{ key: string; label: string; type: string }>;
  rows?: Record<string, string>[];
  notes?: string;
  reason?: string;
}

function exportCSV(columns: Array<{ key: string; label: string }>, rows: Record<string, string>[]) {
  const header = columns.map((c) => c.label).join(",");
  const body = rows.map((row) => columns.map((c) => `"${(row[c.key] || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "study-data.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTableViewer(props: DataTableViewerProps) {
  const { hasData, title, description, columns, rows, notes, reason } = props;

  if (!hasData) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#64748B]">No structured data found</p>
        <p className="text-xs text-[#94A3B8] mt-1">{reason}</p>
      </div>
    );
  }

  if (!columns || !rows) return null;

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">{title}</h3>
          {description && <p className="text-xs text-[#64748B] mt-0.5">{description}</p>}
        </div>
        <button onClick={() => exportCSV(columns, rows)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] transition-colors">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-xs text-[#334155] whitespace-nowrap">{row[col.key] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notes && <p className="mt-3 text-[10px] text-[#94A3B8]">{notes}</p>}
      <p className="mt-1 text-[10px] text-[#CBD5E1]">{rows.length} row{rows.length !== 1 ? "s" : ""}</p>
    </div>
  );
}
