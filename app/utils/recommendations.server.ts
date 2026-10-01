import db from "../db.server";
import { unauthenticated } from "../shopify.server";

export interface RecommendedProduct {
  id: string;
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  price: string;
  currencyCode: string;
  variantId: string;
}

interface OptionItem {
  label?: string;
  imageSrc?: string;
  productId?: string;
  productHandle?: string;
  productTitle?: string;
  productImage?: string;
  products?: Array<{
    productId?: string;
    productTitle?: string;
    productImage?: string;
    productHandle?: string;
  }>;
}

export async function getRecommendations(
  shop: string,
  answers: Array<{ questionId: string; answer: any }>
): Promise<RecommendedProduct[]> {
  if (!answers || answers.length === 0) return [];

  // ── 1. Fetch relevant questions from DB ──────────────────────────────────
  const questionIds = answers.map((a) => a.questionId).filter(Boolean);
  if (questionIds.length === 0) return [];

  const questions = await db.question.findMany({
    where: { id: { in: questionIds }, shopId: shop },
    select: { id: true, options: true },
  });

  if (questions.length === 0) return [];

  // ── 2. Gather mapped product IDs ─────────────────────────────────────────
  const productIds = new Set<string>();

  for (const { questionId, answer } of answers) {
    const question = questions.find((q) => q.id === questionId);
    if (!question) continue;

    const rawOptions = question.options as any;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) continue;

    const isObjectFormat =
      rawOptions.length > 0 && typeof rawOptions[0] === "object";

    if (!isObjectFormat) {
      continue;
    }

    const options = rawOptions as OptionItem[];
    const selectedValues = Array.isArray(answer) ? answer : [answer];

    for (const selectedValue of selectedValues) {
      const matched = options.find(
        (opt) =>
          opt.label === selectedValue || opt.imageSrc === selectedValue
      );
      if (matched) {
        // Support new multi-product list
        if (Array.isArray(matched.products) && matched.products.length > 0) {
          for (const prod of matched.products) {
            if (prod.productId && prod.productId.trim() !== "") {
              productIds.add(prod.productId.trim());
            }
          }
        }
        // Support legacy single-product format
        if (matched.productId && matched.productId.trim() !== "") {
          productIds.add(matched.productId.trim());
        }
      }
    }
  }

  if (productIds.size === 0) return [];

  // ── 3. Initialize Shopify Admin GraphQL Client ───────────────────────────
  console.log(`[Recommendations] Initializing unauthenticated admin for shop: ${shop}`);

  let admin: any;
  try {
    const unauth = await unauthenticated.admin(shop);
    admin = unauth.admin;
    console.log(`[Recommendations] Successfully initialized Admin API client.`);
  } catch (err: any) {
    console.error("[Recommendations] ERR: Failed to retrieve admin access for shop:", shop);
    console.error("[Recommendations] Details:", err.message);
    return [];
  }

  // ── 4. Fetch product details from Shopify ────────────────────────────────
  try {
    const gqlQuery = `
      query GetProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            handle
            title
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              nodes {
                id
              }
            }
          }
        }
      }
    `;

    console.log(`[Recommendations] Fetching details for ${productIds.size} products from Shopify.`);

    const res = await admin.graphql(gqlQuery, {
      variables: { ids: Array.from(productIds) },
    });

    if (!res.ok) {
      let errorBody = "";
      try {
        errorBody = await res.text();
      } catch (e) { }
      console.error(`[Recommendations] GraphQL HTTP error fetching products: Status ${res.status}`);
      console.error(`[Recommendations] Error details:`, errorBody);
      return [];
    }

    const json = (await res.json()) as any;
    const nodes = json?.data?.nodes ?? [];

    const recommendations: RecommendedProduct[] = [];
    for (const node of nodes) {
      if (node && node.id && node.handle) {
        const fullVariantId = node.variants?.nodes?.[0]?.id || "";
        const numericVariantId = fullVariantId.split("/").pop() || "";
        recommendations.push({
          id: node.id,
          handle: node.handle,
          title: node.title ?? "",
          featuredImage: node.featuredImage ?? null,
          price: node.priceRange?.minVariantPrice?.amount ?? "0.00",
          currencyCode: node.priceRange?.minVariantPrice?.currencyCode ?? "USD",
          variantId: numericVariantId,
        });
      }
    }

    console.log("=== Recommendation Generation Summary ===");
    recommendations.forEach((p) => {
      console.log(`[Recommendation] Mapped Product: ${p.title} (${p.handle})`);
    });
    console.log(`Total Products Returned: ${recommendations.length}`);
    console.log("=========================================");

    return recommendations;
  } catch (err) {
    console.error("[Recommendations] Failed to query product details from Shopify:", err);
    return [];
  }
}
