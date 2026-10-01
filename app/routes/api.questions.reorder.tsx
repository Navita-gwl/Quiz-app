import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { jsonApiError } from "../utils/userFacingErrors";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { positions } = body;

    if (!Array.isArray(positions) || positions.length === 0) {
      return Response.json({ error: "Invalid positions array" }, { status: 400 });
    }

    // Update all question positions in a transaction
    await db.$transaction(
      positions.map(({ id, position }: { id: string; position: number }) =>
        db.question.update({
          where: { id, shopId: session.shop },
          data: { position },
        })
      )
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error reordering questions:", error);
    return jsonApiError(error, "We couldn't reorder questions. Please try again.");
  }
};
