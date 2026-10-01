import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getQuizAnalyticsForSidekick } from "../utils/sidekick.server";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, init);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    const { cors } = await authenticate.admin(request);
    return cors(new Response(null, { status: 204 }));
  }

  const { session, cors } = await authenticate.admin(request);

  try {
    const url = new URL(request.url);
    const payload = await getQuizAnalyticsForSidekick(session.shop, {
      datePreset: url.searchParams.get("datePreset") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
    });
    return cors(jsonResponse(payload));
  } catch (error) {
    console.error("[Sidekick] get_quiz_analytics failed:", error);
    return cors(jsonResponse({ error: "Failed to load quiz analytics" }, { status: 500 }));
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    const { cors } = await authenticate.admin(request);
    return cors(new Response(null, { status: 204 }));
  }

  const { session, cors } = await authenticate.admin(request);

  try {
    const body = (await request.json().catch(() => ({}))) as {
      datePreset?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const payload = await getQuizAnalyticsForSidekick(session.shop, body);
    return cors(jsonResponse(payload));
  } catch (error) {
    console.error("[Sidekick] get_quiz_analytics failed:", error);
    return cors(jsonResponse({ error: "Failed to load quiz analytics" }, { status: 500 }));
  }
};
