import db from "../db.server";
import { buildSubmissionWhere } from "./responseFilters.server";
import {
  getDatePresetLabel,
  resolveDateFilterValues,
  normalizeDatePreset,
  type DatePreset,
} from "./responseDateFilters";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

export async function searchQuizzesForSidekick(
  shopId: string,
  { query, limit }: { query?: string; limit?: number }
) {
  const take = clampLimit(limit);
  const search = query?.trim() || "";

  const quizzes = await db.category.findMany({
    where: {
      shopId,
      ...(search ? { title: { contains: search } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take,
    select: {
      id: true,
      title: true,
      quizPublicId: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: {
          questions: true,
          submissions: true,
        },
      },
    },
  });

  return {
    results: quizzes.map((quiz) => ({
      type: "resource_link" as const,
      uri: `gid://application/campaign/${quiz.id}`,
      name: quiz.title,
      mimeType: "application/campaign",
      _meta: {
        quizPublicId: quiz.quizPublicId,
        questionCount: quiz._count.questions,
        responseCount: quiz._count.submissions,
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString(),
      },
    })),
  };
}

export async function searchQuizResponsesForSidekick(
  shopId: string,
  {
    search,
    quizId,
    datePreset,
    dateFrom,
    dateTo,
    limit,
  }: {
    search?: string;
    quizId?: string;
    datePreset?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
) {
  const take = clampLimit(limit);
  const preset = normalizeDatePreset(datePreset) as DatePreset;
  const resolvedDates = resolveDateFilterValues(
    preset,
    dateFrom?.trim() || "",
    dateTo?.trim() || "",
  );

  const where = buildSubmissionWhere(shopId, {
    search: search?.trim() || "",
    quizId: quizId?.trim() || "",
    dateFrom: resolvedDates.dateFrom,
    dateTo: resolvedDates.dateTo,
    timeFrom: "00:00",
    timeTo: "23:59",
  });

  const submissions = await db.quizSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: { answers: true },
      },
    },
  });

  return {
    results: submissions.map((submission) => {
      const params = new URLSearchParams();
      if (submission.email) params.set("search", submission.email);
      if (submission.category?.id) params.set("quizId", submission.category.id);
      const queryString = params.toString();

      return {
        url: queryString ? `app://app/responses?${queryString}` : "app://app/responses",
        _meta: {
          submissionId: submission.id,
          customerName: submission.name,
          customerEmail: submission.email,
          quizTitle: submission.category?.title || "Uncategorized",
          quizId: submission.category?.id || null,
          answerCount: submission._count.answers,
          submittedAt: submission.createdAt.toISOString(),
        },
      };
    }),
  };
}

export async function getQuizAnalyticsForSidekick(
  shopId: string,
  {
    datePreset,
    dateFrom,
    dateTo,
  }: {
    datePreset?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const preset = normalizeDatePreset(datePreset) as DatePreset;
  const resolvedDates = resolveDateFilterValues(
    preset,
    dateFrom?.trim() || "",
    dateTo?.trim() || "",
  );

  const dateWhere = buildSubmissionWhere(shopId, {
    search: "",
    quizId: "",
    dateFrom: resolvedDates.dateFrom,
    dateTo: resolvedDates.dateTo,
    timeFrom: "00:00",
    timeTo: "23:59",
  });

  const [quizzes, submissionGroups, totalResponses, totalQuizzes] = await Promise.all([
    db.category.findMany({
      where: { shopId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    db.quizSubmission.groupBy({
      by: ["categoryId"],
      where: dateWhere,
      _count: { _all: true },
    }),
    db.quizSubmission.count({ where: dateWhere }),
    db.category.count({ where: { shopId } }),
  ]);

  const countByQuizId = new Map<string, number>();
  for (const group of submissionGroups) {
    if (group.categoryId) {
      countByQuizId.set(group.categoryId, group._count._all);
    }
  }

  const quizPerformance = quizzes
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      responseCount: countByQuizId.get(quiz.id) || 0,
    }))
    .sort((a, b) => b.responseCount - a.responseCount || a.title.localeCompare(b.title));

  const topPerformingQuiz = quizPerformance.find((quiz) => quiz.responseCount > 0) ?? null;
  const dateLabel = getDatePresetLabel(preset, resolvedDates.dateFrom, resolvedDates.dateTo);

  return {
    results: [
      {
        url: "app://app/analytics",
        _meta: {
          dateLabel,
          totalResponses,
          totalQuizzes,
          activeQuizzes: quizPerformance.filter((quiz) => quiz.responseCount > 0).length,
          averageResponsesPerQuiz:
            totalQuizzes > 0 ? Math.round((totalResponses / totalQuizzes) * 10) / 10 : 0,
          topPerformingQuiz: topPerformingQuiz
            ? {
                id: topPerformingQuiz.id,
                title: topPerformingQuiz.title,
                responseCount: topPerformingQuiz.responseCount,
              }
            : null,
          quizPerformance: quizPerformance.slice(0, 5),
        },
      },
    ],
  };
}
