import type { Lead } from "@shared/schema";

export type LeadScore = "hot" | "warm" | "cold";

export interface ScoringConfig {
  hotMaxDays: number;
  coldMinDays: number;
}

let _config: ScoringConfig = {
  hotMaxDays: 3,
  coldMinDays: 14,
};

export function getScoringConfig(): ScoringConfig {
  return { ..._config };
}

export function updateScoringConfig(updates: Partial<ScoringConfig>): ScoringConfig {
  _config = { ..._config, ...updates };
  return { ..._config };
}

export function computeScore(lead: Lead, commCount: number = 0): LeadScore {
  const now = Date.now();
  const createdMs = lead.createdAt ? new Date(lead.createdAt).getTime() : now;
  const lastContactMs = lead.lastActionDate
    ? new Date(lead.lastActionDate).getTime()
    : createdMs;

  const daysSinceContact = (now - lastContactMs) / (1000 * 60 * 60 * 24);
  const daysSinceCreation = (now - createdMs) / (1000 * 60 * 60 * 24);

  if (daysSinceContact <= _config.hotMaxDays || (commCount >= 3 && daysSinceContact <= _config.hotMaxDays * 2)) {
    return "hot";
  }
  if (daysSinceContact > _config.coldMinDays && commCount === 0 && daysSinceCreation > _config.coldMinDays) {
    return "cold";
  }
  if (daysSinceContact > _config.coldMinDays) {
    return "cold";
  }
  return "warm";
}
