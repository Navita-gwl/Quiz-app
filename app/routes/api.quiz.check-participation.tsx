import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const existingSubmission = await db.quizSubmission.findFirst({
      where: {
        shopId: session.shop,
        email: email,
      },
    });

    return Response.json({ participated: !!existingSubmission });
  } catch (error) {
    console.error("Error checking participation:", error);
    return Response.json({ error: "Failed to check participation" }, { status: 500 });
  }
};
