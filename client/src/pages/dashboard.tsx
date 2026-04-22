import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Users, TrendingUp, Bot, Circle, Zap } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Lead, SubscriptionPlan } from "@shared/schema";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";

type LeadRecord = Lead & {
  status: string;
  sourceChannel: string | null;
};

const CHANNEL_COLORS: Record<string, string> = {
  messenger: "#1877F2",
  whatsapp: "#25D366",
  web: "#6366f1",
  instagram: "#E4405F",
  other: "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  qualified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function KPICard({ title, value, icon: Icon, isLoading, sub }: {
  title: string;
  value: number | string;
  icon: typeof Users;
  isLoading?: boolean;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl font-bold" data-testid="text-kpi-value">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, used, max, colorClass = "bg-primary" }: {
  label: string;
  used: number;
  max: number;
  colorClass?: string;
}) {
  const unlimited = max >= 999999;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const danger = !unlimited && pct >= 90;
  return (
    <div className="space-y-1" data-testid={`usage-bar-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${danger ? "text-red-500" : ""}`}>
          {unlimited ? `${used} / ∞` : `${used} / ${max}`}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={`h-2 ${danger ? "[&>div]:bg-red-500" : ""}`}
        />
      )}
    </div>
  );
}

function UsageWidget() {
  const { t, isRTL } = useLanguage();
  const { data, isLoading } = useQuery<{
    usage: { leadsCount: number; messagesCount: number; usersCount: number; aiCallsCount: number; month: string };
    limits: SubscriptionPlan | null;
  }>({ queryKey: ["/api/usage"] });

  const { data: sub } = useQuery<{ status: string; plan: SubscriptionPlan; trialEndsAt: string | null } | null>({
    queryKey: ["/api/subscription"],
  });

  const usage = data?.usage;
  const limits = data?.limits;

  const trialEndsAt = sub?.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : null;

  const getStatusLabel = (status: string) => {
    if (status === "trial") return t.subscriptionTrial;
    if (status === "active") return t.subscriptionActive;
    return t.subscriptionInactive;
  };

  return (
    <Card data-testid="card-usage-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          {t.planUsage} — {isRTL ? (limits?.nameAr ?? limits?.name ?? "—") : (limits?.name ?? "—")}
        </CardTitle>
        {sub && (
          <Badge
            variant="outline"
            className={
              sub.status === "trial"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : sub.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }
            data-testid="badge-subscription-status"
          >
            {sub.status === "trial" && daysLeft !== null
              ? `${getStatusLabel("trial")} · ${daysLeft} ${t.trialDaysLeft}`
              : getStatusLabel(sub.status)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : usage && limits ? (
          <div className="space-y-3">
            <UsageBar label={t.usageLeads} used={usage.leadsCount} max={limits.maxLeadsPerMonth} />
            <UsageBar label={t.usageMessages} used={usage.messagesCount} max={limits.maxWhatsappMessagesPerMonth} />
            <UsageBar label={t.usageUsers} used={usage.usersCount} max={limits.maxUsers} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noUsageData}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t, isRTL } = useLanguage();

  const STATUS_LABELS: Record<string, string> = {
    new: t.statusNew,
    contacted: t.statusContacted,
    qualified: t.statusQualified,
    converted: t.statusConverted,
    lost: t.statusLost,
  };

  const CHANNEL_LABELS: Record<string, string> = {
    messenger: t.sourceMessenger,
    whatsapp: t.sourceWhatsapp,
    web: t.sourceWebsite,
    instagram: t.sourceInstagram,
    other: t.sourceOther,
  };

  const { data: analytics, isLoading } = useQuery<{
    totalLeads: number;
    totalConversations: number;
    leadsByChannel: { channel: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
  }>({ queryKey: ["/api/analytics"] });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<LeadRecord[]>({
    queryKey: ["/api/leads"],
  });

  const { data: chatbotConfig } = useQuery<{ isActive: boolean; personaName: string }>({
    queryKey: ["/api/chatbot-config"],
  });

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 10);

  const conversionRate = analytics && analytics.totalLeads > 0
    ? Math.round(((analytics.leadsByStatus.find(s => s.status === "converted")?.count ?? 0) / analytics.totalLeads) * 100)
    : 0;

  const channelChartData = (analytics?.leadsByChannel ?? []).map(item => ({
    name: CHANNEL_LABELS[item.channel] ?? (item.channel.charAt(0).toUpperCase() + item.channel.slice(1)),
    value: item.count,
    color: CHANNEL_COLORS[item.channel] ?? "#6b7280",
  }));

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">{t.overview}</h1>
          <p className="text-muted-foreground">{t.dashboardSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" data-testid="status-bot">
          <Circle
            className="h-2.5 w-2.5 fill-current"
            style={{ color: chatbotConfig?.isActive !== false ? "#22c55e" : "#6b7280" }}
          />
          <span className="font-medium">
            {chatbotConfig?.personaName ?? "SalesBot"}
          </span>
          <Badge
            className={chatbotConfig?.isActive !== false
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}
          >
            {chatbotConfig?.isActive !== false ? t.botOnline : t.botOffline}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t.totalLeads}
          value={analytics?.totalLeads ?? 0}
          icon={Users}
          isLoading={isLoading}
          sub={t.allTime}
        />
        <KPICard
          title={t.communicationLog}
          value={analytics?.totalConversations ?? 0}
          icon={MessageSquare}
          isLoading={isLoading}
          sub={t.allChannelsLabel}
        />
        <KPICard
          title={t.conversionRate}
          value={`${conversionRate}%`}
          icon={TrendingUp}
          isLoading={isLoading}
          sub={t.leadsConverted}
        />
        <KPICard
          title={t.botStatusTitle}
          value={chatbotConfig?.isActive !== false ? t.botOnline : t.botOffline}
          icon={Bot}
          isLoading={false}
          sub={chatbotConfig?.personaName ?? "SalesBot"}
        />
      </div>

      <UsageWidget />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.conversationsByChannel}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : channelChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-2" />
                <p className="text-sm">{t.noChannelData}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={channelChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {channelChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.leadsByStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (analytics?.leadsByStatus.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {analytics?.leadsByStatus.map(item => (
                  <div key={item.status} className="flex items-center justify-between rounded-md border p-3" data-testid={`row-status-${item.status}`}>
                    <span className="font-medium">{STATUS_LABELS[item.status] ?? item.status}</span>
                    <Badge className={STATUS_COLORS[item.status] ?? ""}>{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">{t.noLeadsYet}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.recentLeadsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">{t.noLeadsCaptured}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t.name}</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t.phone}</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t.channel}</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t.status}</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map(lead => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/40" data-testid={`row-recent-lead-${lead.id}`}>
                      <td className="py-2 px-3 font-medium">{lead.name ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{lead.phone ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{CHANNEL_LABELS[lead.sourceChannel ?? ""] ?? lead.sourceChannel ?? "—"}</td>
                      <td className="py-2 px-3">
                        <Badge className={STATUS_COLORS[lead.status ?? ""] ?? ""}>{STATUS_LABELS[lead.status ?? ""] ?? lead.status ?? "—"}</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {lead.createdAt ? format(new Date(lead.createdAt), isRTL ? "d MMM HH:mm" : "MMM d, HH:mm") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
