import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { searchQuizzesForSidekick } from "../utils/sidekick.server";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, init);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    const { cors } = await authenticate.admin(request);
    return cors(new Response(null, { status: 204 }));
  }

  return jsonResponse({ error: "Method not allowed" }, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    const { cors } = await authenticate.admin(request);
    return cors(new Response(null, { status: 204 }));
  }

  const { session, cors } = await authenticate.admin(request);

  try {
    const body = (await request.json().catch(() => ({}))) as {
      query?: string;
      limit?: number;
    };

    const payload = await searchQuizzesForSidekick(session.shop, body);
    return cors(jsonResponse(payload));
  } catch (error) {
    console.error("[Sidekick] search_quizzes failed:", error);
    return cors(jsonResponse({ error: "Failed to search quizzes" }, { status: 500 }));
  }
};
