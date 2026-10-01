import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FilterDateRangePanel } from "./ResponseDateRangePanel";
import {
  getDatePresetLabel,
  isDateRangeSelectionValid,
  normalizeSelectionForApply,
  toSelectionFromFilters,
  type DatePreset,
  type DateRangeSelection,
} from "../utils/responseDateFilters";

type ResponseDateRangeFilterProps = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  isLoading?: boolean;
  onApply: (selection: DateRangeSelection) => void;
};

function selectionsMatch(a: DateRangeSelection, b: DateRangeSelection): boolean {
  return (
    a.preset === b.preset &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo &&
    a.timeFrom === b.timeFrom &&
    a.timeTo === b.timeTo
  );
}

export function ResponseDateRangeFilter({
  datePreset,
  dateFrom,
  dateTo,
  timeFrom,
  timeTo,
  isLoading = false,
  onApply,
}: ResponseDateRangeFilterProps) {
  const popoverId = useId().replace(/:/g, "");
  const hideButtonRef = useRef<HTMLButtonElement>(null);
  const buildAppliedSelection = () =>
    toSelectionFromFilters({ datePreset, dateFrom, dateTo, timeFrom, timeTo });
  const [draft, setDraft] = useState<DateRangeSelection>(buildAppliedSelection);
  const [isApplying, setIsApplying] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<DateRangeSelection | null>(null);

  const closePopover = () => {
    hideButtonRef.current?.click();
  };

  const resetDraft = () => {
    setDraft(buildAppliedSelection());
  };

  useEffect(() => {
    if (!isApplying) {
      setDraft(buildAppliedSelection());
    }
  }, [datePreset, dateFrom, dateTo, timeFrom, timeTo, isApplying]);

  useEffect(() => {
    if (!isApplying || !pendingSelection || isLoading) return;

    const applied = buildAppliedSelection();
    if (selectionsMatch(applied, pendingSelection)) {
      closePopover();
      setIsApplying(false);
      setPendingSelection(null);
    }
  }, [
    isApplying,
    pendingSelection,
    isLoading,
    datePreset,
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
  ]);

  const handleApply = () => {
    if (!isDateRangeSelectionValid(draft) || isApplying || isLoading) return;

    const normalized = normalizeSelectionForApply(draft);
    setPendingSelection(normalized);
    setIsApplying(true);
    onApply(normalized);
  };

  const handleCancel = () => {
    if (isApplying) return;
    resetDraft();
  };

  const showApplyLoader = isApplying || isLoading;

  return (
    <>
      <button
        ref={hideButtonRef}
        type="button"
        hidden
        aria-hidden
        tabIndex={-1}
        commandFor={popoverId}
        command="--hide"
      />

      <s-button
        icon="calendar"
        variant="secondary"
        commandFor={popoverId}
        accessibilityLabel="Select date range"
      >
        {getDatePresetLabel(datePreset, dateFrom, dateTo)}
      </s-button>

      <s-popover id={popoverId} onShow={resetDraft}>
        <div className="overflow-hidden rounded-xl bg-white shadow-xl w-[820px] max-w-[calc(100vw-2rem)]">
          <FilterDateRangePanel
            selection={draft}
            onSelectionChange={setDraft}
            footer={
              <>
                <s-button
                  variant="secondary"
                  commandFor={popoverId}
                  command="--hide"
                  onClick={handleCancel}
                  disabled={isApplying || undefined}
                >
                  Cancel
                </s-button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={
                    !isDateRangeSelectionValid(draft) || showApplyLoader
                  }
                  className="inline-flex items-center justify-center gap-1.5 min-w-[76px] px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-900 disabled:text-white disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                >
                  {showApplyLoader ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Apply
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
              </>
            }
          />
        </div>
      </s-popover>
    </>
  );
}
