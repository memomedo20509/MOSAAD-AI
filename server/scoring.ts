import { db } from "./db";
import { scoringConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Lead } from "@shared/schema";

export type LeadScore = "hot" | "warm" | "cold";

export interface ScoringConfig {
  hotMaxDays: number;
  coldMinDays: number;
  weightRecency: number;
  weightEngagement: number;
  weightTaskCompletion: number;
}

let _cache: ScoringConfig | null = null;

export async function getScoringConfig(): Promise<ScoringConfig> {
  if (_cache) return { ..._cache };
  const [row] = await db.select().from(scoringConfig).where(eq(scoringConfig.id, 1));
  if (row) {
    _cache = {
      hotMaxDays: row.hotMaxDays,
      coldMinDays: row.coldMinDays,
      weightRecency: row.weightRecency,
      weightEngagement: row.weightEngagement,
      weightTaskCompletion: row.weightTaskCompletion,
    };
    return { ..._cache };
  }
  _cache = { hotMaxDays: 3, coldMinDays: 14, weightRecency: 40, weightEngagement: 30, weightTaskCompletion: 30 };
  return { ..._cache };
}

export async function updateScoringConfig(updates: Partial<ScoringConfig>): Promise<ScoringConfig> {
  const current = await getScoringConfig();
  const next: ScoringConfig = {
    hotMaxDays: updates.hotMaxDays ?? current.hotMaxDays,
    coldMinDays: updates.coldMinDays ?? current.coldMinDays,
    weightRecency: updates.weightRecency ?? current.weightRecency,
    weightEngagement: updates.weightEngagement ?? current.weightEngagement,
    weightTaskCompletion: updates.weightTaskCompletion ?? current.weightTaskCompletion,
  };
  next.hotMaxDays = Math.max(1, next.hotMaxDays);
  next.coldMinDays = Math.max(next.hotMaxDays + 1, next.coldMinDays);
  await db
    .insert(scoringConfig)
    .values({ id: 1, ...next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoringConfig.id,
      set: { ...next, updatedAt: new Date() },
    });
  _cache = next;
  return { ...next };
}

export interface ScoringContext {
  commCount: number;
  completedTaskCount: number;
}

export function computeScore(lead: Lead, ctx: ScoringContext, config: ScoringConfig): LeadScore {
  const now = Date.now();
  const createdMs = lead.createdAt ? new Date(lead.createdAt).getTime() : now;
  const lastContactMs = lead.lastActionDate
    ? new Date(lead.lastActionDate).getTime()
    : createdMs;

  const daysSinceContact = (now - lastContactMs) / (1000 * 60 * 60 * 24);
  const { commCount, completedTaskCount } = ctx;

  const totalWeight = config.weightRecency + config.weightEngagement + config.weightTaskCompletion;

  const recencyScore = daysSinceContact <= config.hotMaxDays ? 100
    : daysSinceContact >= config.coldMinDays ? 0
    : Math.round(100 * (1 - (daysSinceContact - config.hotMaxDays) / (config.coldMinDays - config.hotMaxDays)));

  const engagementScore = Math.min(100, commCount * 25);
  const taskScore = Math.min(100, completedTaskCount * 34);

  const weighted =
    (recencyScore * config.weightRecency +
      engagementScore * config.weightEngagement +
      taskScore * config.weightTaskCompletion) /
    totalWeight;

  if (weighted >= 60) return "hot";
  if (weighted >= 30) return "warm";
  return "cold";
}
