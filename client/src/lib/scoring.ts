import type { Lead } from "@shared/schema";

export type LeadScore = "hot" | "warm" | "cold";

export interface ScoreInfo {
  score: LeadScore;
  daysSinceContact: number;
}

export function computeLeadScore(lead: Lead): ScoreInfo {
  const now = Date.now();
  const createdMs = lead.createdAt ? new Date(lead.createdAt).getTime() : now;
  const lastContactMs = lead.lastActionDate
    ? new Date(lead.lastActionDate).getTime()
    : createdMs;

  const daysSinceContact = Math.floor((now - lastContactMs) / (1000 * 60 * 60 * 24));

  const dbScore = lead.score as LeadScore | undefined;
  if (dbScore && (dbScore === "hot" || dbScore === "warm" || dbScore === "cold")) {
    return { score: dbScore, daysSinceContact };
  }

  let score: LeadScore;
  if (daysSinceContact <= 3) {
    score = "hot";
  } else if (daysSinceContact > 14) {
    score = "cold";
  } else {
    score = "warm";
  }

  return { score, daysSinceContact };
}

export const SCORE_COLORS: Record<LeadScore, string> = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-orange-100 text-orange-700 border-orange-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};
