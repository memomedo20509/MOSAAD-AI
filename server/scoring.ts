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
  if (updates.hotMaxDays !== undefined) _config.hotMaxDays = Math.max(1, updates.hotMaxDays);
  if (updates.coldMinDays !== undefined) _config.coldMinDays = Math.max(_config.hotMaxDays + 1, updates.coldMinDays);
  return { ..._config };
}

export interface ScoringContext {
  commCount: number;
  completedTaskCount: number;
}

export function computeScore(lead: Lead, ctx: ScoringContext = { commCount: 0, completedTaskCount: 0 }): LeadScore {
  const now = Date.now();
  const createdMs = lead.createdAt ? new Date(lead.createdAt).getTime() : now;
  const lastContactMs = lead.lastActionDate
    ? new Date(lead.lastActionDate).getTime()
    : createdMs;

  const daysSinceContact = (now - lastContactMs) / (1000 * 60 * 60 * 24);
  const { commCount, completedTaskCount } = ctx;
  const engagementScore = commCount + completedTaskCount;

  if (daysSinceContact <= _config.hotMaxDays) {
    return "hot";
  }
  if (
    daysSinceContact <= _config.hotMaxDays * 2 &&
    engagementScore >= 3
  ) {
    return "hot";
  }
  if (daysSinceContact >= _config.coldMinDays && engagementScore === 0) {
    return "cold";
  }
  if (daysSinceContact >= _config.coldMinDays) {
    return "cold";
  }
  return "warm";
}
