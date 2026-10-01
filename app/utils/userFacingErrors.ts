import { isRouteErrorResponse } from "react-router";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
export const GENERIC_SAVE_ERROR = "We couldn't save your changes. Please try again.";
export const GENERIC_LOAD_ERROR = "We couldn't load this page. Please refresh and try again.";
export const GENERIC_NETWORK_ERROR =
  "A network error occurred. Please check your connection and try again.";

const UNSAFE_MESSAGE_PATTERNS = [
  /internal server error/i,
  /prisma/i,
  /\bP\d{4}\b/,
  /invalid `prisma/i,
  /unique constraint/i,
  /foreign key constraint/i,
  /graphql/i,
  /stack trace/i,
  /ECONNREFUSED/i,
  /ENOENT/i,
  /unexpected token/i,
  /syntaxerror/i,
  /typeerror/i,
  /referenceerror/i,
  /at \/home\//i,
  /at \/app\//i,
];

export function isSafeUserFacingMessage(message: unknown): message is string {
  if (typeof message !== "string") return false;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 220) return false;
  return !UNSAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function toUserFacingError(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE
): string {
  if (isSafeUserFacingMessage(error)) return error.trim();
  if (error instanceof Error && isSafeUserFacingMessage(error.message)) {
    return error.message.trim();
  }
  return fallback;
}

export function getRouteErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status >= 500) return GENERIC_LOAD_ERROR;
    if (error.status === 404) return "The page you're looking for could not be found.";
    if (error.status === 403) return "You don't have permission to view this page.";
    if (typeof error.data === "string" && isSafeUserFacingMessage(error.data)) {
      return error.data.trim();
    }
    if (error.data && typeof error.data === "object" && "error" in error.data) {
      const nested = (error.data as { error?: unknown }).error;
      if (isSafeUserFacingMessage(nested)) return nested.trim();
    }
    if (isSafeUserFacingMessage(error.statusText)) return error.statusText.trim();
    return error.status >= 400 ? GENERIC_ERROR_MESSAGE : GENERIC_LOAD_ERROR;
  }

  if (error instanceof Response) {
    if (error.status >= 500) return GENERIC_LOAD_ERROR;
    if (error.status === 404) return "The page you're looking for could not be found.";
    if (isSafeUserFacingMessage(error.statusText)) return error.statusText.trim();
    return GENERIC_ERROR_MESSAGE;
  }

  return toUserFacingError(error, GENERIC_LOAD_ERROR);
}

export function resolveFetcherError(
  data: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE
): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  if (record.success === false) {
    if (typeof record.error === "string") {
      return toUserFacingError(record.error, fallback);
    }
    if (record.errors && typeof record.errors === "object") {
      return null;
    }
    return fallback;
  }

  if (typeof record.error === "string") {
    return toUserFacingError(record.error, fallback);
  }

  return null;
}

export function jsonActionError(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
  status = 500
) {
  return Response.json(
    { success: false, error: toUserFacingError(error, fallback) },
    { status }
  );
}

export function jsonApiError(
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
  status = 500
) {
  return Response.json({ error: toUserFacingError(error, fallback) }, { status });
}

export async function readJsonErrorMessage(
  response: Response,
  fallback: string = GENERIC_ERROR_MESSAGE
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return toUserFacingError(data.error || data.message, fallback);
  } catch {
    if (response.status >= 500) return GENERIC_ERROR_MESSAGE;
    return fallback;
  }
}
