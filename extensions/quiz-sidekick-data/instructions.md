## When to Use QuizInsights Data Tools

Use these tools when the merchant asks about:
- Product discovery quizzes, quiz funnels, or quiz campaigns in QuizInsights
- Quiz responses, leads, submissions, or customer answers collected from quizzes
- Quiz performance, top performing quizzes, response counts, or analytics

## Tool Selection

- Use `search_quizzes` when the merchant wants to find, list, or inspect quizzes.
- Use `search_quiz_responses` when the merchant asks about customer submissions, leads, emails, names, or answers from a quiz.
- Use `get_quiz_analytics` when the merchant asks for performance summaries, totals, averages, or the best performing quiz.

## Important Guidelines

- QuizInsights stores quizzes as product discovery campaigns. Return concise summaries in `_meta` and use resource links for quizzes so the merchant can open them in the app.
- When filtering responses, prefer `search` for customer name or email. Use `quizId` only when you already know the quiz ID from a prior result.
- For date-based questions, set `datePreset` when possible (`last_7_days`, `last_30_days`, `today`). Use `custom` with `dateFrom` and `dateTo` only when the merchant specifies exact dates.
- Keep responses focused. These tools return at most 25 records per call.

## Common Merchant Questions

- "How many quiz responses did I get this week?" → `get_quiz_analytics` with `datePreset: last_7_days`
- "Show me responses from john@example.com" → `search_quiz_responses` with `search`
- "Which quiz is performing best?" → `get_quiz_analytics`
- "Find my skincare quiz" → `search_quizzes` with `query`
