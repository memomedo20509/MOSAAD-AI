import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<{
    totalLeads: number;
    totalConversations: number;
    leadsByChannel: { channel: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
  }>({ queryKey: ["/api/analytics"] });

  return (
    <div className="space-y-6" data-testid="page-analytics">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Insights about your chatbot performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Total Leads", "Conversations", "Leads by Channel", "Conversion"].map((title, i) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold" data-testid={`text-analytics-${i}`}>
                  {i === 0 ? analytics?.totalLeads ?? 0 :
                   i === 1 ? analytics?.totalConversations ?? 0 :
                   i === 2 ? (analytics?.leadsByChannel.length ?? 0) + " channels" :
                   analytics && analytics.totalLeads > 0
                    ? `${Math.round(((analytics.leadsByStatus.find(s => s.status === "converted")?.count ?? 0) / analytics.totalLeads) * 100)}%`
                    : "0%"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Leads by Status</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (analytics?.leadsByStatus.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics?.leadsByStatus.map(item => {
                  const maxCount = Math.max(...(analytics.leadsByStatus.map(s => s.count)));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.status} data-testid={`bar-status-${item.status}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{item.status}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Leads by Channel</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (analytics?.leadsByChannel.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics?.leadsByChannel.map(item => {
                  const maxCount = Math.max(...(analytics.leadsByChannel.map(s => s.count)));
                  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={item.channel} data-testid={`bar-channel-${item.channel}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{item.channel}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
