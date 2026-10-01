export async function enrichQuestionsWithProducts(admin: any, questions: any[]): Promise<any[]> {
  const productIds = new Set<string>();

  // 1. Collect all unique productIds referenced in options or products array
  for (const question of questions) {
    if (Array.isArray(question.options)) {
      for (const opt of question.options) {
        if (opt && typeof opt === "object") {
          if (opt.productId && typeof opt.productId === "string" && opt.productId.trim() !== "") {
            productIds.add(opt.productId.trim());
          }
          if (Array.isArray(opt.products)) {
            for (const p of opt.products) {
              if (p && typeof p === "object" && p.productId && typeof p.productId === "string" && p.productId.trim() !== "") {
                productIds.add(p.productId.trim());
              }
            }
          }
        }
      }
    }
  }

  if (productIds.size === 0) {
    return questions;
  }

  // 2. Fetch product details in a single query
  const productMap: Record<string, { title: string; handle: string; image: string }> = {};
  try {
    const idsArray = Array.from(productIds);
    const response = await admin.graphql(
      `query GetProductsDetails($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            featuredImage {
              url
            }
          }
        }
      }`,
      { variables: { ids: idsArray } }
    );

    if (response.ok) {
      const json = await response.json();
      const nodes = json?.data?.nodes || [];
      for (const node of nodes) {
        if (node) {
          productMap[node.id] = {
            title: node.title,
            handle: node.handle,
            image: node.featuredImage?.url || "",
          };
        }
      }
    } else {
      console.error("[Enrichment] GraphQL response not OK:", response.status, response.statusText);
    }
  } catch (err) {
    console.error("[Enrichment] Failed to fetch product details from Shopify GraphQL:", err);
  }

  // 3. Map questions and enrich options dynamically
  return questions.map((question) => {
    if (!Array.isArray(question.options)) {
      return question;
    }

    const enrichedOptions = question.options.map((opt: any) => {
      if (typeof opt === "string") return opt;
      if (typeof opt !== "object" || opt === null) return opt;

      const enrichedOpt = { ...opt };

      // Enrich legacy single product fields
      if (enrichedOpt.productId) {
        const details = productMap[enrichedOpt.productId];
        if (details) {
          enrichedOpt.productTitle = details.title;
          enrichedOpt.productHandle = details.handle;
          enrichedOpt.productImage = details.image;
        } else {
          enrichedOpt.productTitle = enrichedOpt.productTitle || "";
          enrichedOpt.productHandle = enrichedOpt.productHandle || "";
          enrichedOpt.productImage = enrichedOpt.productImage || "";
        }
      }

      // Enrich products list
      if (Array.isArray(enrichedOpt.products)) {
        enrichedOpt.products = enrichedOpt.products.map((p: any) => {
          if (p && typeof p === "object" && p.productId) {
            const details = productMap[p.productId];
            return {
              ...p,
              productTitle: details?.title || p.productTitle || "",
              productHandle: details?.handle || p.productHandle || "",
              productImage: details?.image || p.productImage || "",
            };
          }
          return p;
        });
      }

      return enrichedOpt;
    });

    // Return a shallow copy of the question with newly enriched options
    return {
      ...question,
      options: enrichedOptions,
    };
  });
}

export async function enrichSubmissionsWithProducts(admin: any, submissions: any[]): Promise<any[]> {
  const questionMap = new Map<string, any>();
  for (const sub of submissions) {
    if (Array.isArray(sub.answers)) {
      for (const ans of sub.answers) {
        if (ans.question) {
          questionMap.set(ans.question.id, ans.question);
        }
      }
    }
  }

  const uniqueQuestions = Array.from(questionMap.values());
  if (uniqueQuestions.length === 0) {
    return submissions;
  }

  const enrichedQuestions = await enrichQuestionsWithProducts(admin, uniqueQuestions);
  const enrichedQuestionMap = new Map(enrichedQuestions.map(q => [q.id, q]));

  return submissions.map(sub => {
    if (!Array.isArray(sub.answers)) return sub;
    
    return {
      ...sub,
      answers: sub.answers.map((ans: any) => {
        if (!ans.question) return ans;
        const enrichedQ = enrichedQuestionMap.get(ans.question.id);
        return {
          ...ans,
          question: enrichedQ || ans.question
        };
      })
    };
  });
}
