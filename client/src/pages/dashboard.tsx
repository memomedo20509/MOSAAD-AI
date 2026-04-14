import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, TrendingUp, Bot, Circle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";

const CHANNEL_COLORS: Record<string, string> = {
  messenger: "#1877F2",
  whatsapp: "#25D366",
  web: "#6366f1",
  instagram: "#E1306C",
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

export default function Dashboard() {
  const { data: analytics, isLoading } = useQuery<{
    totalLeads: number;
    totalConversations: number;
    leadsByChannel: { channel: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
  }>({ queryKey: ["/api/analytics"] });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
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
    name: item.channel.charAt(0).toUpperCase() + item.channel.slice(1),
    value: item.count,
    color: CHANNEL_COLORS[item.channel] ?? "#6b7280",
  }));

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">Overview</h1>
          <p className="text-muted-foreground">Your SalesBot AI performance at a glance</p>
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
            {chatbotConfig?.isActive !== false ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Leads"
          value={analytics?.totalLeads ?? 0}
          icon={Users}
          isLoading={isLoading}
          sub="All time"
        />
        <KPICard
          title="Conversations"
          value={analytics?.totalConversations ?? 0}
          icon={MessageSquare}
          isLoading={isLoading}
          sub="All channels"
        />
        <KPICard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          isLoading={isLoading}
          sub="Leads converted"
        />
        <KPICard
          title="Bot Status"
          value={chatbotConfig?.isActive !== false ? "Online" : "Offline"}
          icon={Bot}
          isLoading={false}
          sub={chatbotConfig?.personaName ?? "SalesBot"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversations by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : channelChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-2" />
                <p className="text-sm">No channel data yet</p>
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
                  <Tooltip formatter={(val) => [val, "Conversations"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by Status</CardTitle>
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
                    <span className="font-medium capitalize">{item.status}</span>
                    <Badge className={STATUS_COLORS[item.status] ?? ""}>{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No leads yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">No leads captured yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">Channel</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-start py-2 px-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map(lead => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/40" data-testid={`row-recent-lead-${lead.id}`}>
                      <td className="py-2 px-3 font-medium">{lead.name ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{lead.phone ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground capitalize">{lead.sourceChannel ?? "—"}</td>
                      <td className="py-2 px-3">
                        <Badge className={STATUS_COLORS[lead.status] ?? ""}>{lead.status}</Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, HH:mm") : "—"}
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
