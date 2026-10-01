import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ExportDateRangePanel,
  defaultExportSelection,
  isExportSelectionValid,
} from "./ResponseDateRangePanel";
import {
  buildExportSearchParams,
  normalizeSelectionForApply,
  type DateRangeSelection,
} from "../utils/responseDateFilters";

type ResponseExportModalProps = {
  open: boolean;
  onClose: () => void;
  search: string;
  quizId: string;
};

function appendEmbeddedAuthParams(params: URLSearchParams) {
  const current = new URLSearchParams(window.location.search);
  for (const key of ["shop", "host", "embedded", "locale"]) {
    const value = current.get(key);
    if (value) params.set(key, value);
  }
}

function getFilenameFromDisposition(header: string | null): string {
  if (!header) return "quiz-responses.csv";
  const match = header.match(/filename="([^"]+)"/i);
  return match?.[1] || "quiz-responses.csv";
}

async function downloadCsvFromResponse(response: Response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/csv") && !contentType.includes("text/plain")) {
    throw new Error("Export failed. Please try again.");
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(response.headers.get("Content-Disposition"));
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ResponseExportModal({
  open,
  onClose,
  search,
  quizId,
}: ResponseExportModalProps) {
  const [draft, setDraft] = useState<DateRangeSelection>(defaultExportSelection);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(defaultExportSelection());
      setIsExporting(false);
      setExportError(null);
    }
  }, [open]);

  if (!open) return null;

  const normalized = normalizeSelectionForApply(draft);
  const canExport = isExportSelectionValid(normalized);

  const handleExport = async () => {
    if (!canExport || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const params = buildExportSearchParams(normalized, { search, quizId });
      appendEmbeddedAuthParams(params);

      const response = await fetch(`/api/responses/export?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Could not export responses. Please try again.");
      }

      await downloadCsvFromResponse(response);
      onClose();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[820px] max-w-[calc(100vw-2rem)] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Export responses</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select a date and time range for your CSV export
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ExportDateRangePanel
          selection={draft}
          onSelectionChange={setDraft}
          footer={
            <>
              {exportError && (
                <p className="mr-auto text-[11px] font-medium text-red-600">{exportError}</p>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!canExport || isExporting}
                className="inline-flex items-center justify-center gap-1.5 min-w-[84px] px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-900 disabled:text-white disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Export
                  </>
                ) : (
                  "Export"
                )}
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}
