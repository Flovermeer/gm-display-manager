export const DEFAULT_ERROR_MESSAGE = 'Une erreur inattendue est survenue.';

export function errorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (isRecord(error)) {
    const message = error['message'];
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
