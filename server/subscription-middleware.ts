import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { SubscriptionPlan } from "@shared/schema";

const COMPANY_ID = "default";

export async function getActivePlan(): Promise<SubscriptionPlan | null> {
  try {
    const sub = await storage.getSubscription(COMPANY_ID);
    if (!sub) return null;
    return sub.plan;
  } catch {
    return null;
  }
}

export function requireFeature(feature: keyof Pick<SubscriptionPlan,
  "hasAiChatbot" | "hasCampaigns" | "hasAnalytics" | "hasApiAccess" | "hasKnowledgeBase" | "hasPrioritySupport">
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const plan = await getActivePlan();
    if (!plan) return next();
    if (!plan[feature]) {
      return res.status(403).json({
        error: "This feature is not available on your current plan. Please upgrade to access it.",
        code: "FEATURE_NOT_AVAILABLE",
        feature,
      });
    }
    next();
  };
}

export function checkUsageLimit(limitType: "leads" | "messages" | "users") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await storage.getSubscription(COMPANY_ID);
      if (!sub) return next();

      const plan = sub.plan;
      const usage = await storage.getCurrentUsage(COMPANY_ID);

      if (!usage) return next();

      if (limitType === "leads") {
        if (plan.maxLeadsPerMonth < 999999 && usage.leadsCount >= plan.maxLeadsPerMonth) {
          return res.status(429).json({
            error: `You have reached your monthly lead limit (${plan.maxLeadsPerMonth}). Please upgrade to create more leads.`,
            code: "LEAD_LIMIT_EXCEEDED",
            limit: plan.maxLeadsPerMonth,
            current: usage.leadsCount,
            limitType: "leads",
          });
        }
      } else if (limitType === "messages") {
        if (plan.maxWhatsappMessagesPerMonth < 999999 && usage.messagesCount >= plan.maxWhatsappMessagesPerMonth) {
          return res.status(429).json({
            error: `You have reached your monthly message limit (${plan.maxWhatsappMessagesPerMonth}). Please upgrade to send more messages.`,
            code: "MESSAGE_LIMIT_EXCEEDED",
            limit: plan.maxWhatsappMessagesPerMonth,
            current: usage.messagesCount,
            limitType: "messages",
          });
        }
      } else if (limitType === "users") {
        if (plan.maxUsers < 999 && usage.usersCount >= plan.maxUsers) {
          return res.status(429).json({
            error: `You have reached your user limit (${plan.maxUsers}). Please upgrade to add more users.`,
            code: "USER_LIMIT_EXCEEDED",
            limit: plan.maxUsers,
            current: usage.usersCount,
            limitType: "users",
          });
        }
      }

      next();
    } catch (err) {
      console.error("[subscription-middleware] checkUsageLimit error:", err);
      next();
    }
  };
}
