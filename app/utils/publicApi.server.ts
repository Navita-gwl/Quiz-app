import db from "../db.server";
import { getShopPlan } from "../billing.server";
import { checkFeatureAccess } from "../feature";
import { cors } from "./cors";

export type PublicApiRoute = "quiz" | "submit" | "check-email";

const RATE_LIMITS: Record<PublicApiRoute, { limit: number; windowMs: number }> = {
  quiz: { limit: 120, windowMs: 60_000 },
  submit: { limit: 20, windowMs: 60_000 },
  "check-email": { limit: 60, windowMs: 60_000 },
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function normalizeShopDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  const shop = trimmed.endsWith(".myshopify.com")
    ? trimmed
    : `${trimmed.replace(/\.myshopify\.com$/, "")}.myshopify.com`;

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    return null;
  }

  return shop;
}

export function normalizeQuizPublicId(raw: string | null | undefined): string | null {
  const quizId = raw?.trim().toLowerCase();
  if (!quizId || !/^[a-z0-9]{8}$/.test(quizId)) {
    return null;
  }
  return quizId;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("cf-connecting-ip") || "unknown";
}

function isRateLimited(request: Request, shop: string, route: PublicApiRoute): boolean {
  const { limit, windowMs } = RATE_LIMITS[route];
  const key = `${getClientIp(request)}:${shop}:${route}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= limit) {
    return true;
  }

  bucket.count += 1;
  return false;
}

function jsonError(request: Request, message: string, status: number) {
  return cors(
    request,
    Response.json({ error: message }, { status }),
  );
}

/**
 * Headless/public API guard:
 * - validates shop + active install
 * - requires Starter (hydrogen) plan
 * - applies per-IP rate limits
 */
export async function guardPublicApi(
  request: Request,
  shopRaw: string | null | undefined,
  route: PublicApiRoute,
): Promise<{ shop: string } | Response> {
  const shop = normalizeShopDomain(shopRaw || "");
  if (!shop) {
    return jsonError(request, "Invalid shop identifier", 400);
  }

  if (isRateLimited(request, shop, route)) {
    return cors(
      request,
      Response.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        },
      ),
    );
  }

  const [session, currentPlan] = await Promise.all([
    db.session.findFirst({ where: { shop } }),
    getShopPlan(shop),
  ]);

  if (!session) {
    return jsonError(request, "Not found", 404);
  }

  if (!checkFeatureAccess(currentPlan, "hydrogen")) {
    return jsonError(
      request,
      "Headless API access requires the Starter plan.",
      403,
    );
  }

  return { shop };
}

export async function resolvePublicQuizCategory(
  request: Request,
  shop: string,
  quizIdRaw: string | null | undefined,
) {
  const quizId = normalizeQuizPublicId(quizIdRaw);
  if (!quizId) {
    return {
      error: jsonError(
        request,
        "A valid 8-character quizId parameter is required.",
        400,
      ),
    };
  }

  const category = await db.category.findUnique({
    where: { quizPublicId: quizId },
  });

  if (!category || category.shopId !== shop) {
    return {
      error: jsonError(request, "Quiz not found for the supplied Quiz ID", 404),
    };
  }

  return { category, quizId };
}
