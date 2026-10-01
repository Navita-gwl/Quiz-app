import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { jsonApiError } from "../utils/userFacingErrors";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "6");

  const submissionId = params.id;
  if (!submissionId) {
    return Response.json({ error: "Missing submission ID" }, { status: 400 });
  }

  try {
    const submission = await db.quizSubmission.findFirst({
      where: {
        id: submissionId,
        shopId: session.shop,
      },
      select: {
        recommendations: true,
      },
    });

    if (!submission) {
      return Response.json({ error: "Submission not found" }, { status: 404 });
    }

    const recommendations = Array.isArray(submission.recommendations)
      ? (submission.recommendations as any[])
      : [];

    const totalProducts = recommendations.length;
    const totalPages = Math.ceil(totalProducts / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages || 1));
    const skip = (currentPage - 1) * pageSize;
    const paginatedProducts = recommendations.slice(skip, skip + pageSize);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return Response.json({
      products: paginatedProducts,
      pagination: {
        currentPage,
        totalPages,
        totalProducts,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error fetching paginated recommendations:", error);
    return jsonApiError(error, "We couldn't load product recommendations. Please try again.");
  }
};
