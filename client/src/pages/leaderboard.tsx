import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, TrendingUp, Users, Clock } from "lucide-react";

type LeaderboardEntry = {
  userId: string;
  userName: string;
  teamId: string | null;
  teamName: string | null;
  dealsCount: number;
  leadsCount: number;
};

type TeamActivityEntry = {
  agentId: string;
  agentName: string;
  leadsContactedToday: number;
  leadsAddedToday: number;
  avgResponseMinutesThisWeek: number | null;
  uncontactedOver24h: number;
};

const RANK_ICONS = [
  <Trophy className="h-5 w-5 text-yellow-500" />,
  <Medal className="h-5 w-5 text-gray-400" />,
  <Award className="h-5 w-5 text-amber-600" />,
];

function getPeriodOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
    options.push({ value, label });
  }
  return options;
}

function formatResponseTime(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)} د`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours} س ${mins} د` : `${hours} س`;
}

export default function LeaderboardPage() {
  const periodOptions = getPeriodOptions();
  const [period, setPeriod] = useState(periodOptions[0].value);

  const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?period=${encodeURIComponent(period)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const { data: teamActivity = [], isLoading: activityLoading } = useQuery<TeamActivityEntry[]>({
    queryKey: ["/api/dashboard/team-activity"],
  });

  const activityMap = useMemo(() => {
    const map = new Map<string, TeamActivityEntry>();
    teamActivity.forEach((a) => map.set(a.agentId, a));
    return map;
  }, [teamActivity]);

  const sorted = [...entries].sort((a, b) => b.dealsCount - a.dealsCount || b.leadsCount - a.leadsCount);

  const totalDeals = sorted.reduce((s, e) => s + e.dealsCount, 0);
  const totalLeads = sorted.reduce((s, e) => s + e.leadsCount, 0);

  return (
    <div className="space-y-6" data-testid="page-leaderboard">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">لوحة المتصدرين</h1>
          <p className="text-muted-foreground">ترتيب أداء فريق المبيعات</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48" data-testid="select-leaderboard-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الصفقات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold" data-testid="text-total-deals">{totalDeals}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الليدز</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold" data-testid="text-total-leads">{totalLeads}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد السيلز</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold" data-testid="text-agents-count">{sorted.length}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تم التواصل اليوم</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activityLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-contacted-today">
                {teamActivity.reduce((s, a) => s + a.leadsContactedToday, 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ترتيب السيلز</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Trophy className="h-10 w-10 mb-2" />
              <p>لا توجد بيانات للفترة المحددة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-3 px-4 font-medium w-12">#</th>
                    <th className="text-start py-3 px-4 font-medium">السيلز</th>
                    <th className="text-start py-3 px-4 font-medium">الفريق</th>
                    <th className="text-center py-3 px-4 font-medium">الصفقات</th>
                    <th className="text-center py-3 px-4 font-medium">الليدز</th>
                    <th className="text-center py-3 px-4 font-medium">نسبة التحويل</th>
                    <th className="text-center py-3 px-4 font-medium">وقت الاستجابة</th>
                    <th className="text-center py-3 px-4 font-medium">تم التواصل اليوم</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry, idx) => {
                    const convRate = entry.leadsCount > 0 ? Math.round((entry.dealsCount / entry.leadsCount) * 100) : 0;
                    const activity = activityMap.get(entry.userId);
                    return (
                      <tr key={entry.userId} className="border-b last:border-0 hover:bg-muted/50" data-testid={`row-leaderboard-${entry.userId}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center w-8 h-8">
                            {idx < 3 ? RANK_ICONS[idx] : <span className="text-muted-foreground font-medium">{idx + 1}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium" data-testid={`text-agent-name-${entry.userId}`}>{entry.userName}</td>
                        <td className="py-3 px-4 text-muted-foreground" data-testid={`text-team-name-${entry.userId}`}>{entry.teamName ?? "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary" data-testid={`badge-deals-${entry.userId}`}>{entry.dealsCount}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground" data-testid={`text-leads-count-${entry.userId}`}>{entry.leadsCount}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={convRate >= 30 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : convRate >= 15 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}
                            data-testid={`badge-conversion-${entry.userId}`}
                          >
                            {convRate}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground" data-testid={`text-response-time-${entry.userId}`}>
                          {formatResponseTime(activity?.avgResponseMinutesThisWeek ?? null)}
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground" data-testid={`text-contacted-${entry.userId}`}>
                          {activity?.leadsContactedToday ?? 0}
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
    </div>
  );
}
