export default () => {
  shopify.tools.register("search_quizzes", async ({ query, limit }) => {
    const response = await fetch("/api/sidekick/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      throw new Error("Failed to search quizzes");
    }

    return response.json();
  });

  shopify.tools.register("search_quiz_responses", async (input) => {
    const response = await fetch("/api/sidekick/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to search quiz responses");
    }

    return response.json();
  });

  shopify.tools.register("get_quiz_analytics", async (input) => {
    const response = await fetch("/api/sidekick/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error("Failed to load quiz analytics");
    }

    return response.json();
  });
};
