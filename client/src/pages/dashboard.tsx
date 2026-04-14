import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, TrendingUp, Bot } from "lucide-react";

function KPICard({ title, value, icon: Icon, isLoading }: { title: string; value: number | string; icon: typeof Users; isLoading?: boolean }) {
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
          <div className="text-2xl font-bold" data-testid="text-kpi-value">{value}</div>
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

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">Overview</h1>
        <p className="text-muted-foreground">Your SalesBot AI performance at a glance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Leads" value={analytics?.totalLeads ?? 0} icon={Users} isLoading={isLoading} />
        <KPICard title="Conversations" value={analytics?.totalConversations ?? 0} icon={MessageSquare} isLoading={isLoading} />
        <KPICard title="Conversion Rate" value={analytics ? `${analytics.totalLeads > 0 ? Math.round((analytics.leadsByStatus.find(s => s.status === "converted")?.count ?? 0) / analytics.totalLeads * 100) : 0}%` : "0%"} icon={TrendingUp} isLoading={isLoading} />
        <KPICard title="Active Bot" value="Online" icon={Bot} isLoading={false} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                    <span className="text-muted-foreground font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No leads yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (analytics?.leadsByChannel.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {analytics?.leadsByChannel.map(item => (
                  <div key={item.channel} className="flex items-center justify-between rounded-md border p-3" data-testid={`row-channel-${item.channel}`}>
                    <span className="font-medium capitalize">{item.channel}</span>
                    <span className="text-muted-foreground font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">No channel data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
