/**
 * DB migration utilities — normalize old Arabic values stored in the database to canonical IDs.
 * These are NOT UI strings. They exist solely to handle legacy data from before i18n was introduced.
 * Do NOT add new entries here; new data should always use canonical English IDs.
 */

export const LEGACY_INDUSTRY_AR_TO_ID: Record<string, string> = {
  "عقارات": "real_estate",
  "سيارات": "automotive",
  "تأمين": "insurance",
  "تعليم": "education",
  "رعاية صحية": "healthcare",
  "تقنية": "technology",
  "تجزئة": "retail",
  "ضيافة": "hospitality",
  "مالية": "finance",
  "أخرى": "other",
};

export function normalizeIndustry(value: string | null | undefined, validIds?: readonly string[]): string {
  if (!value) return "";
  if (validIds && validIds.includes(value)) return value;
  return LEGACY_INDUSTRY_AR_TO_ID[value] ?? (validIds ? "" : value);
}

export const LEGACY_REALESTATE_BOT_ROLE = "مستشار عقاري";
export const LEGACY_REALESTATE_COMPANY_NAME = "شركتنا العقارية";
export const LEGACY_REALESTATE_CHAT_GOAL = "lead_qualified";
export const LEGACY_REALESTATE_WELCOME_FRAGMENT = "العقارية";
