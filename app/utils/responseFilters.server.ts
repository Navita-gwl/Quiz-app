import type { Prisma } from "@prisma/client";
import {
  DEFAULT_TIME_FROM,
  DEFAULT_TIME_TO,
  normalizeDatePreset,
  normalizeTimeValue,
  parseDateTimeEnd,
  parseDateTimeStart,
  resolveDateFilterValues,
  type DatePreset,
} from "./responseDateFilters";

export type ResponseFilters = {
  search: string;
  quizId: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
};

export function parseResponseFiltersFromUrl(url: URL, now = new Date()): ResponseFilters {
  const datePresetParam = url.searchParams.get("datePreset");
  const dateFromParam = url.searchParams.get("dateFrom")?.trim() || "";
  const dateToParam = url.searchParams.get("dateTo")?.trim() || "";
  let datePreset = normalizeDatePreset(datePresetParam);

  if (!datePresetParam && (dateFromParam || dateToParam)) {
    datePreset = "custom";
  }

  const resolvedDates = resolveDateFilterValues(datePreset, dateFromParam, dateToParam, now);

  return {
    search: url.searchParams.get("search")?.trim() || "",
    quizId: url.searchParams.get("quizId")?.trim() || "",
    datePreset,
    dateFrom: resolvedDates.dateFrom,
    dateTo: resolvedDates.dateTo,
    timeFrom: normalizeTimeValue(url.searchParams.get("timeFrom"), DEFAULT_TIME_FROM),
    timeTo: normalizeTimeValue(url.searchParams.get("timeTo"), DEFAULT_TIME_TO),
  };
}

export function buildSubmissionWhere(
  shopId: string,
  filters: Pick<ResponseFilters, "search" | "quizId" | "dateFrom" | "dateTo" | "timeFrom" | "timeTo">
): Prisma.QuizSubmissionWhereInput {
  const where: Prisma.QuizSubmissionWhereInput = { shopId };

  if (filters.quizId) {
    where.categoryId = filters.quizId;
  }

  const search = filters.search.trim();
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
  }

  const fromDate = parseDateTimeStart(filters.dateFrom, filters.timeFrom);
  const toDate = parseDateTimeEnd(filters.dateTo, filters.timeTo);
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  return where;
}

export function hasActiveResponseFilters(filters: ResponseFilters): boolean {
  return Boolean(
    filters.search ||
      filters.quizId ||
      filters.datePreset !== "all" ||
      (filters.datePreset === "custom" && (filters.dateFrom || filters.dateTo))
  );
}
