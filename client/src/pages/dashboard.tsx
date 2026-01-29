import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { Lead, LeadState } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DashboardStats {
  totalLeads: number;
  leadsByState: { stateId: string; stateName: string; count: number; color: string }[];
  delayedLeads: { assignedTo: string; count: number }[];
}

const stateIcons: Record<string, typeof Users> = {
  "New Leads": UserPlus,
  "Follow Up": Phone,
  "Meeting": Calendar,
  "Done Deal": CheckCircle,
  "Canceled": XCircle,
  "Not Interested": XCircle,
  "Reserved": Clock,
};

export default function Dashboard() {
  const { data: states, isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const isLoading = statesLoading || leadsLoading;

  const stats: DashboardStats | null = !isLoading && states && leads ? {
    totalLeads: leads.length,
    leadsByState: states.map((state) => ({
      stateId: state.id,
      stateName: state.name,
      count: leads.filter((l) => l.stateId === state.id).length,
      color: state.color,
    })),
    delayedLeads: Object.entries(
      leads.reduce((acc, lead) => {
        if (lead.assignedTo) {
          acc[lead.assignedTo] = (acc[lead.assignedTo] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    ).map(([assignedTo, count]) => ({ assignedTo, count })),
  } : null;

  const chartData = stats?.leadsByState.filter(s => s.count > 0) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your sales performance and lead distribution</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-leads">{stats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">All leads in the system</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active States</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-states">{states?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Lead status categories</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Reps</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-assigned-reps">{stats?.delayedLeads.length || 0}</div>
                <p className="text-xs text-muted-foreground">Sales representatives</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-conversion-rate">
                  {stats && stats.totalLeads > 0 
                    ? Math.round((stats.leadsByState.find(s => s.stateName === "Done Deal")?.count || 0) / stats.totalLeads * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Done deals percentage</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {stats?.leadsByState.map((state) => {
                    const Icon = stateIcons[state.stateName] || Clock;
                    return (
                      <div
                        key={state.stateId}
                        className="flex items-center gap-3 rounded-md border p-3 hover-elevate"
                        data-testid={`card-state-${state.stateName.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-md"
                          style={{ backgroundColor: state.color + "20" }}
                        >
                          <Icon className="h-5 w-5" style={{ color: state.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{state.stateName}</p>
                          <p className="text-2xl font-bold">{state.count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Performance Chart</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="stateName"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    No data to display
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Leads by Sales Rep
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.delayedLeads && stats.delayedLeads.length > 0 ? (
                <div className="space-y-2">
                  {stats.delayedLeads.map((item) => (
                    <div
                      key={item.assignedTo}
                      className="flex items-center justify-between rounded-md border p-3"
                      data-testid={`row-rep-${item.assignedTo}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{item.assignedTo}</span>
                      </div>
                      <Badge variant="secondary">{item.count} leads</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-muted-foreground">
                  No assigned leads yet
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
