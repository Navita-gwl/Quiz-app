export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "custom";

export type ExportDatePreset = Exclude<DatePreset, "all">;

export const DEFAULT_TIME_FROM = "00:00";
export const DEFAULT_TIME_TO = "23:59";

export const FILTER_DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last week" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

export const EXPORT_DATE_PRESET_OPTIONS: Array<{ value: ExportDatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last week" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

export type DateRangeSelection = {
  preset: DatePreset;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
};

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonthsToView(view: string, delta: number): string {
  const [year, month] = view.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getCalendarViewFromSelection(selection: DateRangeSelection): string {
  if (selection.dateFrom) return selection.dateFrom.slice(0, 7);
  return new Date().toISOString().slice(0, 7);
}

export function parseDateTimeStart(
  dateValue: string | null | undefined,
  timeValue = DEFAULT_TIME_FROM
): Date | null {
  if (!dateValue) return null;
  const [hours = "0", minutes = "0"] = (timeValue || DEFAULT_TIME_FROM).split(":");
  const date = new Date(
    `${dateValue}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateTimeEnd(
  dateValue: string | null | undefined,
  timeValue = DEFAULT_TIME_TO
): Date | null {
  if (!dateValue) return null;
  const [hours = "23", minutes = "59"] = (timeValue || DEFAULT_TIME_TO).split(":");
  const date = new Date(
    `${dateValue}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:59`
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/** @deprecated use parseDateTimeStart */
export function parseDateStart(value: string | null | undefined): Date | null {
  return parseDateTimeStart(value, DEFAULT_TIME_FROM);
}

/** @deprecated use parseDateTimeEnd */
export function parseDateEnd(value: string | null | undefined): Date | null {
  return parseDateTimeEnd(value, DEFAULT_TIME_TO);
}

export function getPresetDateRange(
  preset: DatePreset | ExportDatePreset,
  now = new Date()
): { from: string; to: string } | null {
  const today = formatDateOnly(now);

  switch (preset) {
    case "all":
      return null;
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const value = formatDateOnly(yesterday);
      return { from: value, to: value };
    }
    case "last_7_days": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: formatDateOnly(from), to: today };
    }
    case "last_30_days": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: formatDateOnly(from), to: today };
    }
    case "custom":
      return null;
    default:
      return null;
  }
}

export function normalizeDatePreset(value: string | null | undefined): DatePreset {
  if (value && FILTER_DATE_PRESET_OPTIONS.some((option) => option.value === value)) {
    return value as DatePreset;
  }
  return "all";
}

export function normalizeTimeValue(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function resolveDateFilterValues(
  datePreset: DatePreset,
  dateFromParam: string,
  dateToParam: string,
  now = new Date()
): { dateFrom: string; dateTo: string } {
  if (datePreset === "custom" || dateFromParam || dateToParam) {
    return {
      dateFrom: dateFromParam,
      dateTo: dateToParam,
    };
  }

  const presetRange = getPresetDateRange(datePreset, now);
  return {
    dateFrom: presetRange?.from || "",
    dateTo: presetRange?.to || "",
  };
}

export function selectionFromPreset(
  preset: DatePreset | ExportDatePreset,
  now = new Date()
): DateRangeSelection {
  if (preset === "all") {
    return {
      preset,
      dateFrom: "",
      dateTo: "",
      timeFrom: DEFAULT_TIME_FROM,
      timeTo: DEFAULT_TIME_TO,
    };
  }

  if (preset === "custom") {
    const today = formatDateOnly(now);
    return {
      preset: "custom",
      dateFrom: today,
      dateTo: today,
      timeFrom: DEFAULT_TIME_FROM,
      timeTo: DEFAULT_TIME_TO,
    };
  }

  const range = getPresetDateRange(preset, now);
  return {
    preset: preset as DatePreset,
    dateFrom: range?.from || "",
    dateTo: range?.to || "",
    timeFrom: DEFAULT_TIME_FROM,
    timeTo: DEFAULT_TIME_TO,
  };
}

export function formatDisplayDate(value: string): string {
  const date = parseDateTimeStart(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDisplayDateLong(value: string): string {
  const date = parseDateTimeStart(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const TIME_OPTIONS: Array<{ value: string; label: string }> = (() => {
  const options: Array<{ value: string; label: string }> = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      options.push({
        value,
        label: date.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      });
    }
  }
  return options;
})();

export function normalizeTimeToOption(value: string, fallback: string): string {
  const normalized = normalizeTimeValue(value, fallback);
  const exact = TIME_OPTIONS.find((option) => option.value === normalized);
  if (exact) return exact.value;
  const [hours = "0", minutes = "0"] = normalized.split(":");
  const roundedMinutes = Number(minutes) < 30 ? "00" : "30";
  const rounded = `${hours.padStart(2, "0")}:${roundedMinutes}`;
  return TIME_OPTIONS.some((option) => option.value === rounded) ? rounded : fallback;
}

export function formatDisplayTime(value: string): string {
  const [hours = "0", minutes = "0"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getDatePresetLabel(
  datePreset: DatePreset,
  dateFrom: string,
  dateTo: string
): string {
  if (datePreset === "custom") {
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return formatDisplayDate(dateFrom);
      return `${formatDisplayDate(dateFrom)} – ${formatDisplayDate(dateTo)}`;
    }
    if (dateFrom) return `From ${formatDisplayDate(dateFrom)}`;
    if (dateTo) return `Until ${formatDisplayDate(dateTo)}`;
    return "Custom range";
  }

  return FILTER_DATE_PRESET_OPTIONS.find((option) => option.value === datePreset)?.label || "All time";
}

export function normalizeSelectionForApply(selection: DateRangeSelection): DateRangeSelection {
  if (selection.preset === "all") {
    return selectionFromPreset("all");
  }

  const resolved =
    selection.preset === "custom"
      ? selection
      : { ...selectionFromPreset(selection.preset), preset: selection.preset };

  return {
    preset: resolved.preset,
    dateFrom: resolved.dateFrom,
    dateTo: resolved.dateTo || resolved.dateFrom,
    timeFrom: normalizeTimeValue(selection.timeFrom, DEFAULT_TIME_FROM),
    timeTo: normalizeTimeValue(selection.timeTo, DEFAULT_TIME_TO),
  };
}

export function buildDateRangeSearchParams(
  selection: DateRangeSelection,
  baseParams = new URLSearchParams()
): URLSearchParams {
  const params = new URLSearchParams(baseParams);

  if (selection.preset === "all") {
    params.delete("datePreset");
    params.delete("dateFrom");
    params.delete("dateTo");
    params.delete("timeFrom");
    params.delete("timeTo");
    return params;
  }

  params.set("datePreset", selection.preset);
  params.set("dateFrom", selection.dateFrom);
  params.set("dateTo", selection.dateTo);
  params.set("timeFrom", selection.timeFrom || DEFAULT_TIME_FROM);
  params.set("timeTo", selection.timeTo || DEFAULT_TIME_TO);
  return params;
}

export function buildExportSearchParams(
  selection: DateRangeSelection,
  filters: { search: string; quizId: string }
): URLSearchParams {
  const normalized = normalizeSelectionForApply(selection);
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.quizId) params.set("quizId", filters.quizId);
  params.set("datePreset", normalized.preset);
  params.set("dateFrom", normalized.dateFrom);
  params.set("dateTo", normalized.dateTo);
  params.set("timeFrom", normalized.timeFrom || DEFAULT_TIME_FROM);
  params.set("timeTo", normalized.timeTo || DEFAULT_TIME_TO);
  return params;
}

export function buildResponsesFilterSearchParams(
  filters: {
    datePreset: DatePreset;
    dateFrom: string;
    dateTo: string;
    timeFrom: string;
    timeTo: string;
  },
  options?: { quizId?: string }
): URLSearchParams {
  const params = new URLSearchParams();
  if (options?.quizId) params.set("quizId", options.quizId);

  const selection = toSelectionFromFilters({
    datePreset: filters.datePreset,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    timeFrom: filters.timeFrom,
    timeTo: filters.timeTo,
  });

  return buildDateRangeSearchParams(selection, params);
}

export function isDateRangeSelectionValid(selection: DateRangeSelection): boolean {
  if (selection.preset === "all") return true;
  return Boolean(selection.dateFrom && selection.dateTo);
}

export function toSelectionFromFilters(filters: {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  timeFrom?: string;
  timeTo?: string;
}): DateRangeSelection {
  if (filters.datePreset === "all") {
    return selectionFromPreset("all");
  }

  if (filters.dateFrom || filters.dateTo) {
    return {
      preset: filters.datePreset,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      timeFrom: normalizeTimeValue(filters.timeFrom, DEFAULT_TIME_FROM),
      timeTo: normalizeTimeValue(filters.timeTo, DEFAULT_TIME_TO),
    };
  }

  return {
    ...selectionFromPreset(filters.datePreset),
    preset: filters.datePreset,
  };
}
