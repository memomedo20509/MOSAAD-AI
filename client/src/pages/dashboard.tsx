import { useQuery, useMutation } from "@tanstack/react-query";
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
  Flame,
  Thermometer,
  Snowflake,
  BarChart2,
  Zap,
  DollarSign,
  Award,
  ShieldCheck,
  Shuffle,
} from "lucide-react";
import type { Lead, LeadState, Reminder, LeadHistory, Commission } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useLanguage } from "@/lib/i18n";
import { format, isToday, isBefore, startOfToday, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";
import { computeLeadScore } from "@/lib/scoring";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

function formatResponseTime(minutes: number | null, minutesAbbr: string, hoursAbbr: string): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} ${minutesAbbr}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}${hoursAbbr} ${m}${minutesAbbr}` : `${h}${hoursAbbr}`;
}

type UserLike = { id?: string; username?: string; firstName?: string | null; lastName?: string | null };

function getUserAssignmentKeys(user: UserLike): string[] {
  const keys: string[] = [];
  if (user.id) keys.push(user.id);
  if (user.username) keys.push(user.username);
  const fullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : null;
  if (fullName) keys.push(fullName);
  return keys;
}

function isAssignedToUser(lead: { assignedTo?: string | null }, user: UserLike): boolean {
  if (!lead.assignedTo || lead.assignedTo.trim() === "") return false;
  return getUserAssignmentKeys(user).includes(lead.assignedTo);
}

const stateIcons: Record<string, typeof Users> = {
  "New Leads": UserPlus,
  "Follow Up": Phone,
  "Meeting": Calendar,
  "Done Deal": CheckCircle,
  "Canceled": XCircle,
  "Not Interested": XCircle,
  "Reserved": Clock,
  "ليد جديد": UserPlus,
  "تحت المتابعة": Phone,
  "ميتنج": Calendar,
  "عرض سعر": Target,
  "محجوز": Clock,
  "تم الصفقة": CheckCircle,
  "ملغي": XCircle,
};

function isDoneState(stateName: string) {
  return stateName === "Done Deal" || stateName === "تم الصفقة";
}

function LoadingSkeletons() {
  return (
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
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  valueClass = "",
  testId,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
  valueClass?: string;
  testId?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass}`} data-testid={testId}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES AGENT DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function SalesAgentDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const today = startOfToday();

  const { data: states } = useQuery<LeadState[]>({ queryKey: ["/api/states"] });
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["/api/reminders"] });
  const { data: commissions = [] } = useQuery<Commission[]>({ queryKey: ["/api/commissions"] });

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const { data: myTarget } = useQuery<{ dealsTarget: number; leadsTarget: number; revenueTarget: number | null } | null>({
    queryKey: ["/api/monthly-targets", user?.id, currentMonth],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/monthly-targets/${user.id}?month=${currentMonth}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const myLeads = (leads || []).filter((l) => user && isAssignedToUser(l, user));

  const doneDealLeads = myLeads.filter((l) => {
    const state = (states || []).find((s) => s.id === l.stateId);
    return state && isDoneState(state.name);
  });

  const conversionRate = myLeads.length > 0
    ? Math.round((doneDealLeads.length / myLeads.length) * 100)
    : 0;

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const myLeadsThisMonth = myLeads.filter(l => l.createdAt && new Date(l.createdAt) >= monthStart && new Date(l.createdAt) <= monthEnd);
  const myDealsThisMonth = myLeads.filter(l => {
    const state = (states || []).find((s) => s.id === l.stateId);
    return state && isDoneState(state.name) && l.updatedAt && new Date(l.updatedAt) >= monthStart && new Date(l.updatedAt) <= monthEnd;
  });

  const dealsPct = myTarget?.dealsTarget ? Math.min(100, Math.round((myDealsThisMonth.length / myTarget.dealsTarget) * 100)) : 0;
  const leadsPct = myTarget?.leadsTarget ? Math.min(100, Math.round((myLeadsThisMonth.length / myTarget.leadsTarget) * 100)) : 0;

  const myCommissionsThisMonth = commissions
    .filter((c) => c.agentId === user?.id && c.month === currentMonth)
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const revenuePct = myTarget?.revenueTarget ? Math.min(100, Math.round((myCommissionsThisMonth / myTarget.revenueTarget) * 100)) : 0;

  const myReminders = reminders.filter((r) => !r.userId || r.userId === user?.id);
  const upcomingReminders = myReminders
    .filter((r) => !r.isCompleted && r.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
  const overdueReminders = myReminders.filter((r) => !r.isCompleted && r.dueDate && isBefore(new Date(r.dueDate), today));

  const scores = myLeads.map((l) => computeLeadScore(l).score);
  const hot = scores.filter((s) => s === "hot").length;
  const warm = scores.filter((s) => s === "warm").length;
  const cold = scores.filter((s) => s === "cold").length;

  const newLeadsTodayCount = myLeads.filter((l) => l.createdAt && isToday(new Date(l.createdAt))).length;

  const leadsByState = (states || []).map((state) => ({
    stateId: state.id,
    stateName: state.name,
    count: myLeads.filter((l) => l.stateId === state.id).length,
    color: state.color,
  })).filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.dashboardSubtitle}</p>
      </div>

      {leadsLoading ? <LoadingSkeletons /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard title={t.myLeads} value={myLeads.length} subtitle={t.allLeadsInSystem} icon={Users} testId="text-my-leads-count" />
            <KPICard title={t.myConversionRate} value={`${conversionRate}%`} subtitle={t.doneDealsPercentage} icon={TrendingUp} testId="text-my-conversion-rate" />
            <KPICard title={t.myCommissions} value={`${myCommissionsThisMonth.toLocaleString()} ${t.currency}`} subtitle={currentMonth} icon={DollarSign} valueClass="text-green-600 dark:text-green-400" testId="text-my-commissions" />
            <KPICard title={t.newLeadsToday} value={newLeadsTodayCount} subtitle={format(new Date(), "MMM dd, yyyy")} icon={UserPlus} testId="text-new-leads-today" />
          </div>

          {myTarget && (myTarget.dealsTarget > 0 || myTarget.leadsTarget > 0 || (myTarget.revenueTarget && myTarget.revenueTarget > 0)) && (
            <Card data-testid="card-monthly-goal">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {t.myMonthlyGoal} — {currentMonth}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myTarget.dealsTarget > 0 && (
                    <div data-testid="progress-deals">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{t.dealsAchieved}</span>
                        <span className="font-bold text-primary">{myDealsThisMonth.length} / {myTarget.dealsTarget}</span>
                      </div>
                      <Progress value={dealsPct} className="h-3" data-testid="progress-bar-deals" />
                      <p className="text-xs text-muted-foreground mt-1">{dealsPct}% {t.achievementRate}</p>
                    </div>
                  )}
                  {myTarget.leadsTarget > 0 && (
                    <div data-testid="progress-leads">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{t.leadsAchieved}</span>
                        <span className="font-bold text-primary">{myLeadsThisMonth.length} / {myTarget.leadsTarget}</span>
                      </div>
                      <Progress value={leadsPct} className="h-3" data-testid="progress-bar-leads" />
                      <p className="text-xs text-muted-foreground mt-1">{leadsPct}% {t.achievementRate}</p>
                    </div>
                  )}
                  {myTarget.revenueTarget && myTarget.revenueTarget > 0 && (
                    <div data-testid="progress-revenue">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{t.revenueAchieved}</span>
                        <span className="font-bold text-primary">{myCommissionsThisMonth.toLocaleString()} / {myTarget.revenueTarget.toLocaleString()} {t.currency}</span>
                      </div>
                      <Progress value={revenuePct} className="h-3" data-testid="progress-bar-revenue" />
                      <p className="text-xs text-muted-foreground mt-1">{revenuePct}% {t.achievementRate}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-lead-score-summary" className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-500" />
                  {t.leadScoreSummary}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t.scoreHot, count: hot, icon: <Flame className="h-5 w-5 text-red-500" />, cls: "bg-red-50 border-red-200 dark:bg-red-950/20" },
                    { label: t.scoreWarm, count: warm, icon: <Thermometer className="h-5 w-5 text-orange-500" />, cls: "bg-orange-50 border-orange-200 dark:bg-orange-950/20" },
                    { label: t.scoreCold, count: cold, icon: <Snowflake className="h-5 w-5 text-blue-500" />, cls: "bg-blue-50 border-blue-200 dark:bg-blue-950/20" },
                  ].map(({ label, count, icon, cls }) => (
                    <div key={label} className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 ${cls}`}>
                      {icon}
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-xs font-medium text-center">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2" data-testid="card-my-lead-status-distribution">
              <CardHeader>
                <CardTitle>{t.myLeadStatusDistribution}</CardTitle>
              </CardHeader>
              <CardContent>
                {leadsByState.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {leadsByState.map((state) => {
                      const Icon = stateIcons[state.stateName] || Clock;
                      return (
                        <div
                          key={state.stateId}
                          className="flex items-center gap-3 rounded-md border p-3 hover-elevate"
                          data-testid={`card-state-${state.stateName.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ backgroundColor: state.color + "20" }}>
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
                ) : (
                  <div className="flex h-[150px] items-center justify-center text-muted-foreground">{t.noDataToDisplay}</div>
                )}
              </CardContent>
            </Card>
          </div>

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
                        data-testid={`row-reminder-${reminder.id}`}
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
                        <Badge variant={isOverdue ? "destructive" : "secondary"}>{reminder.priority}</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noReminders}</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM LEADER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function TeamLeaderDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: states } = useQuery<LeadState[]>({ queryKey: ["/api/states"] });
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: users = [] } = useQuery<{ id: string; username: string; firstName?: string; lastName?: string; role: string; teamId?: string }[]>({ queryKey: ["/api/users"] });
  const { data: commissions = [] } = useQuery<Commission[]>({ queryKey: ["/api/commissions"] });
  const { data: teamActivity = [] } = useQuery<{
    agentId: string;
    agentName: string;
    leadsContactedToday: number;
    leadsAddedToday: number;
    avgResponseMinutesThisWeek: number | null;
    uncontactedOver24h: number;
  }[]>({
    queryKey: ["/api/dashboard/team-activity"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const { data: targetsWithAchievement = [] } = useQuery<{
    userId: string;
    userName: string;
    dealsCount: number;
    leadsCount: number;
    dealsTarget: number;
    leadsTarget: number;
  }[]>({
    queryKey: ["/api/monthly-targets-with-achievement", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-targets-with-achievement?month=${currentMonth}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const teamMembers = users.filter((u) => u.teamId === user?.teamId && u.role === "sales_agent");
  const teamMemberIds = new Set(teamMembers.map((u) => u.id));

  const getMemberLeads = (member: typeof teamMembers[0]) => {
    return (leads || []).filter((l) => isAssignedToUser(l, member));
  };

  const teamLeads = (leads || []).filter((l) =>
    teamMembers.some((m) => isAssignedToUser(l, m))
  );
  const doneDealStateIds = (states || []).filter((s) => isDoneState(s.name)).map((s) => s.id);
  const teamDoneDeals = teamLeads.filter((l) => l.stateId && doneDealStateIds.includes(l.stateId));
  const teamConversionRate = teamLeads.length > 0 ? Math.round((teamDoneDeals.length / teamLeads.length) * 100) : 0;

  const teamCommissionsThisMonth = commissions
    .filter((c) => c.month === currentMonth && c.agentId && teamMemberIds.has(c.agentId))
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const hotLeadsInTeam = teamLeads.filter((l) => computeLeadScore(l).score === "hot").slice(0, 10);

  const myTeamActivity = teamActivity.filter((a) => teamMemberIds.has(a.agentId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.dashboardSubtitle}</p>
      </div>

      {leadsLoading ? <LoadingSkeletons /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard title={t.totalTeamLeads} value={teamLeads.length} subtitle={t.allLeadsInSystem} icon={Users} testId="text-total-team-leads" />
            <KPICard title={t.teamConversionRate} value={`${teamConversionRate}%`} subtitle={t.doneDealsPercentage} icon={TrendingUp} testId="text-team-conversion-rate" />
            <KPICard title={t.teamCommissionsThisMonth} value={`${teamCommissionsThisMonth.toLocaleString()} ${t.currency}`} subtitle={currentMonth} icon={DollarSign} valueClass="text-green-600 dark:text-green-400" testId="text-team-commissions" />
            <KPICard title={t.assignedReps} value={teamMembers.length} subtitle={t.salesRepresentatives} icon={Users} testId="text-team-member-count" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-team-members-performance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {t.teamMembersPerformance}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noDataToDisplay}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-start py-2 px-2 font-medium">{t.memberName}</th>
                          <th className="text-center py-2 px-2 font-medium">{t.memberLeads}</th>
                          <th className="text-center py-2 px-2 font-medium">{t.memberConversion}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => {
                          const memberLeads = getMemberLeads(member);
                          const memberDone = memberLeads.filter((l) => l.stateId && doneDealStateIds.includes(l.stateId));
                          const memberConv = memberLeads.length > 0 ? Math.round((memberDone.length / memberLeads.length) * 100) : 0;
                          const displayName = member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.username;
                          return (
                            <tr key={member.id} className="border-b last:border-0" data-testid={`row-member-${member.id}`}>
                              <td className="py-2 px-2 font-medium">{displayName}</td>
                              <td className="text-center py-2 px-2">
                                <Badge variant="outline">{memberLeads.length}</Badge>
                              </td>
                              <td className="text-center py-2 px-2">
                                <Badge variant={memberConv >= 20 ? "default" : "secondary"}>{memberConv}%</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-hot-leads-in-team">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-500" />
                  {t.hotLeadsInTeam}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hotLeadsInTeam.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noHotLeads}</div>
                ) : (
                  <div className="space-y-2">
                    {hotLeadsInTeam.map((lead) => (
                      <Link key={lead.id} href={`/leads/${lead.id}`}>
                        <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 hover-elevate cursor-pointer" data-testid={`row-hot-lead-${lead.id}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <Flame className="h-4 w-4 text-red-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{lead.name || t.noName}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.assignedTo || "—"}</p>
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0">{t.scoreHot}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-team-activity-today">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                {t.teamActivityToday}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t.teamActivitySubtitle}</p>
            </CardHeader>
            <CardContent>
              {myTeamActivity.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noTeamActivity}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-2 font-medium">{t.agent}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.leadsContactedToday}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.leadsAddedToday}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.avgResponseThisWeek}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.uncontactedLeads}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myTeamActivity.map((agent) => (
                        <tr key={agent.agentId} className="border-b last:border-0" data-testid={`row-team-activity-${agent.agentId}`}>
                          <td className="py-3 px-2 font-medium">{agent.agentName}</td>
                          <td className="text-center py-3 px-2">
                            <Badge variant={agent.leadsContactedToday > 0 ? "default" : "secondary"}>{agent.leadsContactedToday}</Badge>
                          </td>
                          <td className="text-center py-3 px-2">
                            <Badge variant="outline">{agent.leadsAddedToday}</Badge>
                          </td>
                          <td className="text-center py-3 px-2">
                            <Badge variant={agent.avgResponseMinutesThisWeek !== null && agent.avgResponseMinutesThisWeek <= 60 ? "default" : "secondary"}>
                              {formatResponseTime(agent.avgResponseMinutesThisWeek, t.minutesAbbr, t.hoursAbbr)}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-2">
                            {agent.uncontactedOver24h > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {agent.uncontactedOver24h}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {targetsWithAchievement.length > 0 && (
            <Card data-testid="card-team-targets">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {t.teamTargets} — {currentMonth}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-2 px-2 font-medium">{t.agent}</th>
                        <th className="text-center py-2 px-2 font-medium">{t.deals}</th>
                        <th className="text-center py-2 px-2 font-medium">{t.allLeads}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targetsWithAchievement.map((entry) => (
                        <tr key={entry.userId} className="border-b last:border-0" data-testid={`row-target-${entry.userId}`}>
                          <td className="py-2 px-2 font-medium">{entry.userName}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-16 text-center">{entry.dealsCount}/{entry.dealsTarget || "—"}</span>
                              {entry.dealsTarget > 0 && (
                                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.round((entry.dealsCount / entry.dealsTarget) * 100))}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-16 text-center">{entry.leadsCount}/{entry.leadsTarget || "—"}</span>
                              {entry.leadsTarget > 0 && (
                                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, Math.round((entry.leadsCount / entry.leadsTarget) * 100))}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES ADMIN / SALES MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function SalesAdminDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: teamLoad = [] } = useQuery<{ userId: string; userName: string; leadCount: number; role: string }[]>({ queryKey: ["/api/team-load"] });
  const { data: teamActivity = [] } = useQuery<{
    agentId: string;
    agentName: string;
    leadsContactedToday: number;
    leadsAddedToday: number;
    avgResponseMinutesThisWeek: number | null;
    uncontactedOver24h: number;
  }[]>({
    queryKey: ["/api/dashboard/team-activity"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const unassignedLeads = (leads || []).filter((l) => !l.assignedTo || l.assignedTo.trim() === "");

  const distributeAllMutation = useMutation({
    mutationFn: async () => {
      const ids = unassignedLeads.map((l) => l.id);
      if (ids.length === 0) return;
      await apiRequest("POST", "/api/leads/auto-assign", { leadIds: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-load"] });
      toast({ title: t.distributed });
    },
    onError: () => {
      toast({ title: t.distributionError, variant: "destructive" });
    },
  });

  const chartData = teamLoad.map((agent) => ({
    name: agent.userName,
    leads: agent.leadCount,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.dashboardSubtitle}</p>
      </div>

      {leadsLoading ? <LoadingSkeletons /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard title={t.totalLeads} value={(leads || []).length} subtitle={t.allLeadsInSystem} icon={Users} testId="text-total-leads" />
            <KPICard title={t.unassignedLeads} value={unassignedLeads.length} subtitle={t.autoAssign} icon={UserPlus} valueClass={unassignedLeads.length > 0 ? "text-amber-600 dark:text-amber-400" : ""} testId="text-unassigned-leads" />
            <KPICard title={t.assignedReps} value={teamLoad.length} subtitle={t.salesRepresentatives} icon={Users} testId="text-assigned-reps" />
            <KPICard title={t.newLeadsToday} value={(leads || []).filter((l) => l.createdAt && isToday(new Date(l.createdAt))).length} subtitle={format(new Date(), "MMM dd, yyyy")} icon={UserPlus} testId="text-new-leads-today" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-unassigned-leads">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  {t.unassignedLeads}
                </CardTitle>
                <Button
                  size="sm"
                  disabled={unassignedLeads.length === 0 || distributeAllMutation.isPending}
                  onClick={() => distributeAllMutation.mutate()}
                  data-testid="button-distribute-all"
                >
                  <Shuffle className="h-4 w-4 me-1" />
                  {distributeAllMutation.isPending ? t.distributing : t.distributeAll}
                </Button>
              </CardHeader>
              <CardContent>
                {unassignedLeads.length === 0 ? (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noUnassignedLeads}</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {unassignedLeads.slice(0, 10).map((lead) => (
                      <Link key={lead.id} href={`/leads/${lead.id}`}>
                        <div className="flex items-center justify-between rounded-md border p-3 hover-elevate cursor-pointer" data-testid={`row-unassigned-lead-${lead.id}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/20">
                              <UserPlus className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{lead.name || t.noName}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.channel || "—"}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {lead.createdAt ? format(new Date(lead.createdAt), "MMM dd") : "—"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                    {unassignedLeads.length > 10 && (
                      <p className="text-center text-xs text-muted-foreground pt-2">+{unassignedLeads.length - 10} {t.andMoreLeads}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-load-balancing">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  {t.loadBalancing}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t.teamLoadSubtitle}</p>
              </CardHeader>
              <CardContent>
                {teamLoad.length > 0 ? (
                  <div className="space-y-3">
                    {teamLoad.map((agent) => {
                      const maxCount = Math.max(...teamLoad.map((a) => a.leadCount), 1);
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
                  <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noAgentsAvailable}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card data-testid="card-load-balancing-chart">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  {t.loadBalancing}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-response-time-table">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {t.avgResponseTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamActivity.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noTeamActivity}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-2 font-medium">{t.agent}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.leadsContactedToday}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.avgResponseThisWeek}</th>
                        <th className="text-center py-3 px-2 font-medium">{t.uncontactedLeads}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamActivity.map((agent) => (
                        <tr key={agent.agentId} className="border-b last:border-0" data-testid={`row-team-activity-${agent.agentId}`}>
                          <td className="py-3 px-2 font-medium">{agent.agentName}</td>
                          <td className="text-center py-3 px-2">
                            <Badge variant={agent.leadsContactedToday > 0 ? "default" : "secondary"}>{agent.leadsContactedToday}</Badge>
                          </td>
                          <td className="text-center py-3 px-2">
                            <Badge variant={agent.avgResponseMinutesThisWeek !== null && agent.avgResponseMinutesThisWeek <= 60 ? "default" : "secondary"}>
                              {formatResponseTime(agent.avgResponseMinutesThisWeek, t.minutesAbbr, t.hoursAbbr)}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-2">
                            {agent.uncontactedOver24h > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {agent.uncontactedOver24h}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY OWNER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function CompanyOwnerDashboard({ showSystemStats = false }: { showSystemStats?: boolean }) {
  const { t } = useLanguage();

  const { data: states } = useQuery<LeadState[]>({ queryKey: ["/api/states"] });
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: commissions = [] } = useQuery<Commission[]>({ queryKey: ["/api/commissions"] });
  const { data: users = [] } = useQuery<{ id: string; username: string; firstName?: string; lastName?: string; role: string; teamId?: string; isActive?: boolean }[]>({ queryKey: ["/api/users"] });
  const { data: teams = [] } = useQuery<{ id: string; name: string }[]>({ queryKey: ["/api/teams"] });

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const doneDealStateIds = (states || []).filter((s) => isDoneState(s.name)).map((s) => s.id);
  const totalLeads = (leads || []).length;
  const totalDoneDeals = (leads || []).filter((l) => l.stateId && doneDealStateIds.includes(l.stateId)).length;
  const overallConversionRate = totalLeads > 0 ? Math.round((totalDoneDeals / totalLeads) * 100) : 0;

  const totalMonthlyCommissions = commissions
    .filter((c) => c.month === currentMonth)
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const activeUsers = users.filter((u) => u.isActive !== false);

  const agentCommissions = commissions
    .filter((c) => c.month === currentMonth)
    .reduce((acc, c) => {
      if (!c.agentId) return acc;
      if (!acc[c.agentId]) acc[c.agentId] = { agentId: c.agentId, agentName: c.agentName || c.agentId, total: 0, deals: 0 };
      acc[c.agentId].total += c.commissionAmount || 0;
      acc[c.agentId].deals += 1;
      return acc;
    }, {} as Record<string, { agentId: string; agentName: string; total: number; deals: number }>);

  const bestAgent = Object.values(agentCommissions).sort((a, b) => b.total - a.total)[0] || null;

  const teamComparison = teams.map((team) => {
    const teamUsers = users.filter((u) => u.teamId === team.id);
    const teamLeadsList = (leads || []).filter((l) =>
      teamUsers.some((u) => isAssignedToUser(l, u))
    );
    const teamDone = teamLeadsList.filter((l) => l.stateId && doneDealStateIds.includes(l.stateId));
    const teamConv = teamLeadsList.length > 0 ? Math.round((teamDone.length / teamLeadsList.length) * 100) : 0;
    const teamCommTotal = commissions.filter((c) => {
      const member = users.find((u) => u.teamId === team.id && u.id === c.agentId);
      return !!member && c.month === currentMonth;
    }).reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
    return { teamId: team.id, teamName: team.name, leadsCount: teamLeadsList.length, conversionRate: teamConv, commissions: teamCommTotal };
  }).filter((t) => t.leadsCount > 0);

  const pieData = (states || []).map((state) => ({
    name: state.name,
    value: (leads || []).filter((l) => l.stateId === state.id).length,
    color: state.color,
  })).filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.dashboardSubtitle}</p>
      </div>

      {leadsLoading ? <LoadingSkeletons /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard title={t.totalMonthlyCommissions} value={`${totalMonthlyCommissions.toLocaleString()} ${t.currency}`} subtitle={currentMonth} icon={DollarSign} valueClass="text-green-600 dark:text-green-400" testId="text-total-monthly-commissions" />
            <KPICard title={t.overallConversionRate} value={`${overallConversionRate}%`} subtitle={t.doneDealsPercentage} icon={TrendingUp} testId="text-overall-conversion-rate" />
            <KPICard title={t.totalLeads} value={totalLeads} subtitle={t.allLeadsInSystem} icon={Users} testId="text-total-leads" />
            {showSystemStats ? (
              <KPICard title={t.activeUsersCount} value={activeUsers.length} subtitle={t.systemStats} icon={ShieldCheck} testId="text-active-users" />
            ) : (
              <KPICard title={t.assignedReps} value={users.filter((u) => u.role === "sales_agent").length} subtitle={t.salesRepresentatives} icon={Users} testId="text-assigned-reps" />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-best-agent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  {t.bestAgentThisMonth}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bestAgent ? (
                  <div className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4" data-testid="card-best-agent-info">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{bestAgent.agentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {bestAgent.total.toLocaleString()} {t.currency} · {bestAgent.deals} {t.deals}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-20 items-center justify-center text-muted-foreground">{t.noDataToDisplay}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-performance-chart">
              <CardHeader>
                <CardTitle>{t.performanceChart}</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" nameKey="name">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-muted-foreground">{t.noDataToDisplay}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {teamComparison.length > 0 && (
            <Card data-testid="card-teams-comparison">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t.teamsComparison}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-2 px-2 font-medium">{t.teamName}</th>
                        <th className="text-center py-2 px-2 font-medium">{t.totalTeamLeads}</th>
                        <th className="text-center py-2 px-2 font-medium">{t.conversionRate}</th>
                        <th className="text-center py-2 px-2 font-medium">{t.teamCommissionsThisMonth}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamComparison.map((team) => (
                        <tr key={team.teamId} className="border-b last:border-0" data-testid={`row-team-${team.teamId}`}>
                          <td className="py-2 px-2 font-medium">{team.teamName}</td>
                          <td className="text-center py-2 px-2">
                            <Badge variant="outline">{team.leadsCount}</Badge>
                          </td>
                          <td className="text-center py-2 px-2">
                            <Badge variant={team.conversionRate >= 20 ? "default" : "secondary"}>{team.conversionRate}%</Badge>
                          </td>
                          <td className="text-center py-2 px-2 font-medium text-green-600 dark:text-green-400">
                            {team.commissions.toLocaleString()} {t.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {showSystemStats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card data-testid="card-system-stats-users">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.activeUsersCount}</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-users-stat">{activeUsers.length}</div>
                  <p className="text-xs text-muted-foreground">{t.systemStats}</p>
                </CardContent>
              </Card>
              <Card data-testid="card-system-stats-agents">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.salesRepresentatives}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.filter((u) => u.role === "sales_agent").length}</div>
                  <p className="text-xs text-muted-foreground">{t.assignedReps}</p>
                </CardContent>
              </Card>
              <Card data-testid="card-system-stats-teams">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t.teams}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teams.length}</div>
                  <p className="text-xs text-muted-foreground">{t.teamsComparison}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD — routes to role-specific dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = user?.role;

  if (!role) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        {t.loadingDashboard}
      </div>
    );
  }

  if (role === "sales_agent") {
    return <SalesAgentDashboard />;
  }

  if (role === "team_leader") {
    return <TeamLeaderDashboard />;
  }

  if (role === "sales_admin" || role === "sales_manager") {
    return <SalesAdminDashboard />;
  }

  if (role === "company_owner") {
    return <CompanyOwnerDashboard showSystemStats={false} />;
  }

  if (role === "super_admin" || role === "admin") {
    return <CompanyOwnerDashboard showSystemStats={true} />;
  }

  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground" data-testid="text-unsupported-role">
      <p className="font-medium">{t.unsupportedRole}</p>
      <p className="text-sm">{t.unsupportedRoleDescription}</p>
    </div>
  );
}
