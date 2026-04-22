import type { translations } from "./i18n";

type TranslationKeys = typeof translations.ar;

/**
 * Parse a raw API error message (e.g., "403: {...json...}") into a structured object.
 */
export function parseApiError(error: Error): { status: number; code?: string; message: string; limitType?: string } {
  const raw = error.message;
  const colonIdx = raw.indexOf(":");
  const status = colonIdx > -1 ? parseInt(raw.slice(0, colonIdx), 10) : 0;
  const body = colonIdx > -1 ? raw.slice(colonIdx + 1).trim() : raw;

  try {
    const parsed = JSON.parse(body);
    return {
      status,
      code: parsed.code,
      message: parsed.error || body,
      limitType: parsed.limitType,
    };
  } catch {
    return { status, message: body };
  }
}

/**
 * Map a server error to a translated message using i18n keys.
 * Falls back to the raw server error message when no specific code mapping exists.
 */
export function getTranslatedErrorMessage(error: Error, t: TranslationKeys): string {
  const { code, message } = parseApiError(error);

  switch (code) {
    case "FEATURE_NOT_AVAILABLE":
      return t.errFeatureNotAvailable;
    case "LEAD_LIMIT_EXCEEDED":
      return t.errLeadLimitExceeded;
    case "MESSAGE_LIMIT_EXCEEDED":
      return t.errMessageLimitExceeded;
    case "USER_LIMIT_EXCEEDED":
      return t.errUserLimitExceeded;
    case "TRANSITION_BLOCKED_UNTOUCHED":
      return t.errTransitionUntouched;
    case "TRANSITION_BLOCKED_BACKWARD":
      return t.errTransitionBackward;
    case "TRANSITION_BLOCKED_ADMIN_REQUIRED":
      return t.errTransitionAdminRequired;
    case "TRANSITION_BLOCKED_SAME_ZONE":
      return t.errTransitionSameZone;
    case "SYSTEM_STATE_DELETE":
      return t.errSystemStateDelete;
    default:
      return message || t.errUnexpected;
  }
}
