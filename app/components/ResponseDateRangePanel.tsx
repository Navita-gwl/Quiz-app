import { ArrowRight, Calendar, ChevronDown, Clock } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FILTER_DATE_PRESET_OPTIONS,
  EXPORT_DATE_PRESET_OPTIONS,
  TIME_OPTIONS,
  addMonthsToView,
  formatDisplayDate,
  getCalendarViewFromSelection,
  normalizeTimeToOption,
  selectionFromPreset,
  DEFAULT_TIME_FROM,
  DEFAULT_TIME_TO,
  type DatePreset,
  type DateRangeSelection,
  type ExportDatePreset,
} from "../utils/responseDateFilters";

type PresetOption = { value: string; label: string };

type ResponseDateRangePanelProps = {
  selection: DateRangeSelection;
  onSelectionChange: (selection: DateRangeSelection) => void;
  presets: PresetOption[];
  footer?: ReactNode;
};

function getRangeValue(dateFrom: string, dateTo: string): string {
  if (dateFrom && dateTo) return `${dateFrom}--${dateTo}`;
  if (dateFrom) return `${dateFrom}--`;
  return "";
}

function getCalendarMonths(dateFrom: string, dateTo: string) {
  const fallback = getCalendarViewFromSelection({
    preset: "custom",
    dateFrom,
    dateTo,
    timeFrom: DEFAULT_TIME_FROM,
    timeTo: DEFAULT_TIME_TO,
  });
  const left = dateFrom ? dateFrom.slice(0, 7) : fallback;

  if (!dateTo) {
    return { left, right: addMonthsToView(left, 1) };
  }

  const endMonth = dateTo.slice(0, 7);
  if (endMonth > left) {
    return { left, right: endMonth };
  }

  return { left, right: left };
}

function ReadOnlyDateField({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="min-w-[158px] flex-1">
      <span className="block text-[9px] font-medium text-slate-500 mb-0.5 uppercase tracking-wide">
        {label}
      </span>
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${
          muted
            ? "bg-slate-50 border-slate-200 text-slate-500"
            : "bg-white border-slate-200 text-slate-800"
        }`}
      >
        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
        <span>{value ? formatDisplayDate(value) : "—"}</span>
      </div>
    </div>
  );
}

function TimeDropdown({
  value,
  onChange,
  fallback = DEFAULT_TIME_FROM,
}: {
  value: string;
  onChange: (value: string) => void;
  fallback?: string;
}) {
  const normalized = normalizeTimeToOption(value, fallback);

  return (
    <div className="relative w-[108px] shrink-0">
      <select
        value={normalized}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none pl-2 pr-6 py-1.5 rounded-md text-[11px] font-medium text-slate-800 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
      >
        {TIME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

function CalendarPicker({
  type,
  value,
  view,
  readOnly,
  onViewChange,
  onChange,
}: {
  type: "single" | "range";
  value: string;
  view: string;
  readOnly?: boolean;
  onViewChange?: (view: string) => void;
  onChange?: (event: Event) => void;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 overflow-hidden bg-white [&_s-date-picker]:block [&_s-date-picker]:w-full ${
        readOnly ? "pointer-events-none select-none" : ""
      }`}
    >
      <s-date-picker
        type={type}
        value={value}
        view={view}
        onChange={readOnly ? undefined : onChange}
        onViewChange={
          readOnly
            ? undefined
            : (event) => {
                const target = event.currentTarget as HTMLElement & { view?: string };
                if (target.view && onViewChange) onViewChange(target.view);
              }
        }
      />
    </div>
  );
}

function CalendarCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}

export function ResponseDateRangePanel({
  selection,
  onSelectionChange,
  presets,
  footer,
}: ResponseDateRangePanelProps) {
  const isAllTime = selection.preset === "all";
  const isCustom = selection.preset === "custom";
  const showPresetDates = !isAllTime && !isCustom;
  const showCalendars = !isAllTime;
  const rangeValue = getRangeValue(selection.dateFrom, selection.dateTo);

  const [leftMonth, setLeftMonth] = useState(() =>
    getCalendarMonths(selection.dateFrom, selection.dateTo).left
  );
  const [rightMonth, setRightMonth] = useState(() =>
    getCalendarMonths(selection.dateFrom, selection.dateTo).right
  );
  const [showTimePanel, setShowTimePanel] = useState(false);
  const previousPresetRef = useRef(selection.preset);

  useEffect(() => {
    if (previousPresetRef.current !== selection.preset) {
      previousPresetRef.current = selection.preset;
      const months = getCalendarMonths(selection.dateFrom, selection.dateTo);
      setLeftMonth(months.left);
      setRightMonth(months.right);
      return;
    }

    if (!isCustom) {
      const months = getCalendarMonths(selection.dateFrom, selection.dateTo);
      setLeftMonth(months.left);
      setRightMonth(months.right);
    }
  }, [selection.preset, selection.dateFrom, selection.dateTo, isCustom]);

  useEffect(() => {
    if (!isCustom) setShowTimePanel(false);
  }, [isCustom]);

  const handlePresetClick = (preset: string) => {
    onSelectionChange(selectionFromPreset(preset as DatePreset));
  };

  const handleStartDateChange = (event: Event) => {
    const target = event.currentTarget as HTMLElement & { value?: string };
    const dateFrom = target.value || "";
    if (!dateFrom) return;

    let dateTo = selection.dateTo;
    if (!dateTo || dateTo < dateFrom) dateTo = dateFrom;

    onSelectionChange({
      preset: "custom",
      dateFrom,
      dateTo,
      timeFrom: selection.timeFrom,
      timeTo: selection.timeTo,
    });
  };

  const handleEndDateChange = (event: Event) => {
    const target = event.currentTarget as HTMLElement & { value?: string };
    const dateTo = target.value || "";
    if (!dateTo) return;

    let dateFrom = selection.dateFrom;
    if (!dateFrom || dateFrom > dateTo) dateFrom = dateTo;

    onSelectionChange({
      preset: "custom",
      dateFrom,
      dateTo,
      timeFrom: selection.timeFrom,
      timeTo: selection.timeTo,
    });
  };

  const handleTimeChange = (patch: Partial<Pick<DateRangeSelection, "timeFrom" | "timeTo">>) => {
    onSelectionChange({
      ...selection,
      preset: "custom",
      ...patch,
    });
  };

  return (
    <div className="flex flex-col bg-white">
      <div className="flex min-h-[300px]">
        <nav className="w-[132px] shrink-0 border-r border-slate-200 py-3 px-2 flex flex-col gap-0.5">
          {presets.map((option) => {
            const isActive = selection.preset === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePresetClick(option.value)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-[12px] leading-tight transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-[580px] p-4">
          {isAllTime ? (
            <div className="flex h-full min-h-[260px] items-center justify-center text-center px-6">
              <p className="text-[12px] text-slate-500 leading-relaxed">
                All responses are included. Select a preset or custom range to filter by date.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <ReadOnlyDateField
                  label="Start date"
                  value={selection.dateFrom}
                  muted={showPresetDates}
                />

                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mb-2" />

                <ReadOnlyDateField
                  label="End date"
                  value={selection.dateTo}
                  muted={showPresetDates}
                />

                {isCustom && (
                  <button
                    type="button"
                    onClick={() => setShowTimePanel((open) => !open)}
                    className={`mb-0.5 ml-1 shrink-0 p-1.5 rounded-md border transition-colors ${
                      showTimePanel
                        ? "bg-slate-100 border-slate-300 text-slate-800"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                    aria-label="Toggle time selection"
                    title="Set time range"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isCustom && showTimePanel && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 flex items-end gap-2">
                  <TimeDropdown
                    value={selection.timeFrom}
                    onChange={(timeFrom) => handleTimeChange({ timeFrom })}
                  />
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mb-2" />
                  <TimeDropdown
                    value={selection.timeTo}
                    fallback={DEFAULT_TIME_TO}
                    onChange={(timeTo) => handleTimeChange({ timeTo })}
                  />
                </div>
              )}

              {showPresetDates && (
                <p className="text-[10px] text-slate-500">
                  Highlighted dates show the{" "}
                  {presets.find((option) => option.value === selection.preset)?.label.toLowerCase()}{" "}
                  range. Choose custom range to edit.
                </p>
              )}

              {showCalendars && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  {isCustom ? (
                    <div className="grid grid-cols-2 gap-3">
                      <CalendarCard title="Date From">
                        <CalendarPicker
                          type="single"
                          value={selection.dateFrom}
                          view={leftMonth}
                          onViewChange={setLeftMonth}
                          onChange={handleStartDateChange}
                        />
                      </CalendarCard>
                      <CalendarCard title="Date To">
                        <CalendarPicker
                          type="single"
                          value={selection.dateTo}
                          view={rightMonth}
                          onViewChange={setRightMonth}
                          onChange={handleEndDateChange}
                        />
                      </CalendarCard>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <CalendarCard title="Date From">
                        <CalendarPicker
                          type="range"
                          value={rangeValue}
                          view={leftMonth}
                          readOnly
                        />
                      </CalendarCard>
                      <CalendarCard title="Date To">
                        <CalendarPicker
                          type="range"
                          value={rangeValue}
                          view={rightMonth}
                          readOnly
                        />
                      </CalendarCard>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 bg-slate-50/80">
          {footer}
        </div>
      )}
    </div>
  );
}

export function FilterDateRangePanel(props: Omit<ResponseDateRangePanelProps, "presets">) {
  return <ResponseDateRangePanel {...props} presets={FILTER_DATE_PRESET_OPTIONS} />;
}

export function ExportDateRangePanel(props: Omit<ResponseDateRangePanelProps, "presets">) {
  return <ResponseDateRangePanel {...props} presets={EXPORT_DATE_PRESET_OPTIONS} />;
}

export function defaultExportSelection(): DateRangeSelection {
  return selectionFromPreset("last_30_days" as ExportDatePreset);
}

export function isExportSelectionValid(selection: DateRangeSelection): boolean {
  return selection.preset === "all" ? false : Boolean(selection.dateFrom && selection.dateTo);
}
