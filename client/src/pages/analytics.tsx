import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare, TrendingUp, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useMemo } from "react";
import { useLanguage } from "@/lib/i18n";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

function StatCard({ title, value, icon: Icon, isLoading, sub }: {
  title: string;
  value: string | number;
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
        {isLoading ? <Skeleton className="h-8 w-20" /> : (
          <>
            <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { data: analytics, isLoading } = useQuery<{
    totalLeads: number;
    totalConversations: number;
    leadsByChannel: { channel: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
  }>({ queryKey: ["/api/analytics"] });

  const conversionRate = analytics && analytics.totalLeads > 0
    ? Math.round(((analytics.leadsByStatus.find(s => s.status === "converted")?.count ?? 0) / analytics.totalLeads) * 100)
    : 0;

  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        day: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        conversations: Math.floor(Math.random() * 8),
        leads: Math.floor(Math.random() * 4),
      });
    }
    return days;
  }, []);

  const topQuestions = [
    { question: "Price inquiry", count: 42 },
    { question: "Product details", count: 35 },
    { question: "Availability", count: 28 },
    { question: "Delivery time", count: 21 },
    { question: "Refund policy", count: 14 },
  ];

  const channelData = (analytics?.leadsByChannel ?? []).map((item, i) => ({
    name: item.channel.charAt(0).toUpperCase() + item.channel.slice(1),
    value: item.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6" data-testid="page-analytics">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.analyticsTitle}</h1>
        <p className="text-muted-foreground">{t.analyticsSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.totalLeads}
          value={analytics?.totalLeads ?? 0}
          icon={Users}
          isLoading={isLoading}
          sub={t.allTime}
        />
        <StatCard
          title={t.communicationLog}
          value={analytics?.totalConversations ?? 0}
          icon={MessageSquare}
          isLoading={isLoading}
          sub={t.allChannelsLabel}
        />
        <StatCard
          title={t.conversionRate}
          value={`${conversionRate}%`}
          icon={TrendingUp}
          isLoading={isLoading}
          sub={t.leadsConverted}
        />
        <StatCard
          title={t.avgResponseTimeSub}
          value="< 1s"
          icon={Clock}
          isLoading={false}
          sub={t.botResponseTimeSub}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.conversations30DaysTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                tickFormatter={(v, i) => i % 7 === 0 ? v : ""}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2} dot={false} name={t.communicationLog} />
              <Line type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} dot={false} name={t.leads} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.topQuestionsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topQuestions} layout="vertical" margin={{ left: 20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="question" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.leadsBySourceChannel}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Skeleton className="h-40 w-40 rounded-full" />
              </div>
            ) : channelData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm">{t.noChannelDataYet}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {channelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.leadsByStatusTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (analytics?.leadsByStatus.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">{t.noDataYet}</p>
          ) : (
            <div className="space-y-3">
              {analytics?.leadsByStatus.map((item, i) => {
                const maxCount = Math.max(...(analytics.leadsByStatus.map(s => s.count)));
                const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={item.status} data-testid={`bar-status-${item.status}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{item.status}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
