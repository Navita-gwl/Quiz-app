import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { GENERIC_SAVE_ERROR, jsonActionError } from "../utils/userFacingErrors";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return Response.json(
      { success: false, error: "Question ID is required" },
      { status: 400 }
    );
  }

  try {
    // First, verify the question belongs to this shop (security)
    const question = await db.question.findUnique({
      where: { id },
    });

    if (!question) {
      return Response.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    if (question.shopId !== session.shop) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Delete the question from database
    await db.question.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return jsonActionError(error, "We couldn't delete this question. Please try again.");
  }
};
