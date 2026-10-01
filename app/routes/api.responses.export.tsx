import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  buildSubmissionWhere,
  parseResponseFiltersFromUrl,
} from "../utils/responseFilters.server";
import {
  buildResponsesCsv,
  buildResponsesExportFilename,
} from "../utils/responseExport.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const filters = parseResponseFiltersFromUrl(url);

  const submissions = await db.quizSubmission.findMany({
    where: buildSubmissionWhere(session.shop, filters),
    include: {
      category: {
        select: { title: true },
      },
      answers: {
        select: {
          questionText: true,
          answer: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const csv = buildResponsesCsv(submissions);
  const filename = buildResponsesExportFilename();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};
