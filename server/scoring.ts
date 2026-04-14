export interface ScoringContext {
  lastActionDate?: Date | null;
  responseTimeMinutes?: number | null;
  tasksDone?: number;
  totalTasks?: number;
  channel?: string | null;
}

export interface ScoringConfig {
  hotThresholdDays?: number;
  coldThresholdDays?: number;
  weights?: Record<string, number>;
}

let _config: ScoringConfig = {
  hotThresholdDays: 3,
  coldThresholdDays: 14,
};

export function updateScoringConfig(config: Partial<ScoringConfig>): void {
  _config = { ..._config, ...config };
}

export function getScoringConfig(): ScoringConfig {
  return _config;
}

export function computeScore(ctx: ScoringContext): string {
  if (!ctx.lastActionDate) return "cold";
  const daysSinceAction = (Date.now() - new Date(ctx.lastActionDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceAction <= (_config.hotThresholdDays ?? 3)) return "hot";
  if (daysSinceAction <= (_config.coldThresholdDays ?? 14)) return "warm";
  return "cold";
}
