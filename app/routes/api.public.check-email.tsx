import type { LoaderFunctionArgs } from "react-router";
import { cors } from "../utils/cors";
import db from "../db.server";
import { guardPublicApi, resolvePublicQuizCategory } from "../utils/publicApi.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");
  const email = url.searchParams.get("email");
  const quizParam =
    url.searchParams.get("quiz")?.trim() || url.searchParams.get("quizId")?.trim();

  if (!email) {
    return cors(request, Response.json({ error: "Missing email parameter" }, { status: 400 }));
  }

  const guard = await guardPublicApi(request, shopParam, "check-email");
  if (guard instanceof Response) return guard;
  const { shop } = guard;

  const resolved = await resolvePublicQuizCategory(request, shop, quizParam);
  if ("error" in resolved) return resolved.error;
  const { category } = resolved;

  try {
    const existingSubmission = await db.quizSubmission.findFirst({
      where: {
        shopId: shop,
        email: email.trim().toLowerCase(),
        categoryId: category.id,
      },
    });

    return cors(request, Response.json({ alreadySubmitted: !!existingSubmission }));
  } catch (error) {
    console.error("Error checking email participation:", error);
    return cors(request, Response.json({ error: "Failed to check participation" }, { status: 500 }));
  }
};
