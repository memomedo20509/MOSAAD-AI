import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  Bell,
  Activity,
  Target,
  ArrowRight,
  Flame,
  Thermometer,
  Snowflake,
  BarChart2,
} from "lucide-react";
import type { Lead, LeadState, Reminder, LeadHistory } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useLanguage } from "@/lib/i18n";
import { format, isToday, isBefore, startOfToday, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Link } from "wouter";
import { computeLeadScore } from "@/lib/scoring";

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
  const { t, isRTL } = useLanguage();
  
  const { data: states, isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: history = [] } = useQuery<LeadHistory[]>({
    queryKey: ["/api/history"],
  });

  const { data: teamLoad = [] } = useQuery<{ userId: string; userName: string; leadCount: number; role: string }[]>({
    queryKey: ["/api/team-load"],
  });

  const isLoading = statesLoading || leadsLoading;

  const today = startOfToday();
  const monthRange = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
  
  const newLeadsToday = leads?.filter((l) => l.createdAt && isToday(new Date(l.createdAt))).length || 0;
  
  const upcomingReminders = reminders.filter((r) => !r.isCompleted && r.dueDate).slice(0, 5);
  const overdueReminders = reminders.filter((r) => !r.isCompleted && r.dueDate && isBefore(new Date(r.dueDate), today));
  
  const recentActivities = history
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 8);

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
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.dashboardSubtitle}</p>
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
                <CardTitle className="text-sm font-medium">{t.totalLeads}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-leads">{stats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">{t.allLeadsInSystem}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.newLeadsToday}</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-new-leads-today">{newLeadsToday}</div>
                <p className="text-xs text-muted-foreground">{format(new Date(), "MMM dd, yyyy")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.assignedReps}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-assigned-reps">{stats?.delayedLeads.length || 0}</div>
                <p className="text-xs text-muted-foreground">{t.salesRepresentatives}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.conversionRate}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-conversion-rate">
                  {stats && stats.totalLeads > 0 
                    ? Math.round((stats.leadsByState.find(s => s.stateName === "Done Deal")?.count || 0) / stats.totalLeads * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">{t.doneDealsPercentage}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>{t.leadStatusDistribution}</CardTitle>
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
                <CardTitle>{t.performanceChart}</CardTitle>
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
                    {t.noDataToDisplay}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-upcoming-reminders">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  {t.upcomingReminders}
                </CardTitle>
                {overdueReminders.length > 0 && (
                  <Badge variant="destructive">{overdueReminders.length} {t.overdueReminders}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {upcomingReminders.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingReminders.map((reminder) => {
                      const isOverdue = reminder.dueDate && isBefore(new Date(reminder.dueDate), today);
                      return (
                        <div
                          key={reminder.id}
                          className={`flex items-center justify-between rounded-md border p-3 ${isOverdue ? "border-destructive/50 bg-destructive/5" : ""}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isOverdue ? "bg-destructive/10" : "bg-primary/10"}`}>
                              <Bell className={`h-4 w-4 ${isOverdue ? "text-destructive" : "text-primary"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{reminder.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {reminder.dueDate && format(new Date(reminder.dueDate), "MMM dd, HH:mm")}
                              </p>
                            </div>
                          </div>
                          <Badge variant={isOverdue ? "destructive" : "secondary"}>
                            {reminder.priority}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">
                    {t.noReminders}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-recent-activities">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {t.recentActivities}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-sm">{activity.action}</p>
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {activity.createdAt && format(new Date(activity.createdAt), "HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">
                    {t.noDataToDisplay}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-500" />
                  {t.leadsBySalesRep}
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
                        <Badge variant="secondary">{item.count} {t.leads}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">
                    {t.noAssignedLeadsYet}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-team-load">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  {t.teamLoad}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t.teamLoadSubtitle}</p>
              </CardHeader>
              <CardContent>
                {teamLoad.length > 0 ? (
                  <div className="space-y-3">
                    {teamLoad.map((agent) => {
                      const maxCount = Math.max(...teamLoad.map(a => a.leadCount), 1);
                      const pct = Math.round((agent.leadCount / maxCount) * 100);
                      return (
                        <div key={agent.userId} className="space-y-1" data-testid={`row-agent-load-${agent.userId}`}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate">{agent.userName}</span>
                            <Badge variant="outline" className="text-xs">{agent.leadCount} {t.leadsCount}</Badge>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct >= 80 ? "#ef4444" : pct >= 50 ? "#f59e0b" : "#22c55e",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">
                    {t.noAgentsAvailable}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-lead-score-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                {t.leadScore}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const scores = (leads || []).map(l => computeLeadScore(l).score);
                  const hot = scores.filter(s => s === "hot").length;
                  const warm = scores.filter(s => s === "warm").length;
                  const cold = scores.filter(s => s === "cold").length;
                  return [
                    { label: t.scoreHot, count: hot, icon: <Flame className="h-5 w-5 text-red-500" />, cls: "bg-red-50 border-red-200 dark:bg-red-950/20" },
                    { label: t.scoreWarm, count: warm, icon: <Thermometer className="h-5 w-5 text-orange-500" />, cls: "bg-orange-50 border-orange-200 dark:bg-orange-950/20" },
                    { label: t.scoreCold, count: cold, icon: <Snowflake className="h-5 w-5 text-blue-500" />, cls: "bg-blue-50 border-blue-200 dark:bg-blue-950/20" },
                  ].map(({ label, count, icon, cls }) => (
                    <div key={label} className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 ${cls}`}>
                      {icon}
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
