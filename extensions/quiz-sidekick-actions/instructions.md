## When to Use QuizInsights Actions

Use the quiz edit intent when the merchant wants to open, review, or change a specific QuizInsights quiz returned from Sidekick search results.

## Important Guidelines

- Quiz search results use `application/campaign` resource links. When the merchant asks to open or edit a quiz from those results, invoke the campaign `edit` intent.
- The quiz ID in search results maps to `/app/quizzes/{id}/customize` in QuizInsights.
- For listing responses or viewing analytics without editing a quiz, use the QuizInsights data tools instead of this action intent.

## Common Workflows

1. Merchant asks Sidekick to find a quiz → use `search_quizzes`.
2. Merchant asks to open or edit that quiz → invoke the campaign edit intent with the quiz ID from the resource link URI tail.
3. Merchant asks about submissions or performance → use `search_quiz_responses` or `get_quiz_analytics`, which return links to `/app/responses` and `/app/analytics`.
