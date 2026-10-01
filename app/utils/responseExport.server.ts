type ExportAnswer = {
  questionText: string | null;
  answer: unknown;
};

type ExportSubmission = {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
  category?: { title: string | null } | null;
  answers: ExportAnswer[];
};

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAnswerValue(answer: unknown): string {
  if (answer == null) return "";
  if (Array.isArray(answer)) {
    return answer.map((item) => formatAnswerValue(item)).filter(Boolean).join("; ");
  }
  if (typeof answer === "object") {
    try {
      return JSON.stringify(answer);
    } catch {
      return String(answer);
    }
  }
  return String(answer);
}

function formatAnswersSummary(answers: ExportAnswer[]): string {
  return answers
    .map((entry) => {
      const question = entry.questionText?.trim() || "Question";
      const value = formatAnswerValue(entry.answer);
      return `${question}: ${value}`;
    })
    .join(" | ");
}

export function buildResponsesCsv(submissions: ExportSubmission[]): string {
  const headers = [
    "Submitted At",
    "Quiz Name",
    "Customer Name",
    "Email Address",
    "Answer Count",
    "Responses",
  ];

  const rows = submissions.map((submission) => {
    const submittedAt = new Date(submission.createdAt);
    return [
      submittedAt.toISOString(),
      submission.category?.title || "General",
      submission.name,
      submission.email,
      String(submission.answers.length),
      formatAnswersSummary(submission.answers),
    ].map((value) => escapeCsv(String(value ?? "")));
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function buildResponsesExportFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `quiz-responses-${stamp}.csv`;
}
