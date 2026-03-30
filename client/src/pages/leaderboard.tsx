import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Users, TrendingUp, Settings } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Team, User } from "@shared/schema";

type LeaderboardEntry = {
  userId: string;
  userName: string;
  teamId: string | null;
  teamName: string | null;
  dealsCount: number;
  leadsCount: number;
};

type TargetEntry = LeaderboardEntry & {
  dealsTarget: number;
  leadsTarget: number;
  revenueTarget: number | null;
};

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];

function getMedalOrRank(rank: number) {
  if (rank <= 3) return MEDAL_EMOJIS[rank - 1];
  return `#${rank}`;
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function SetTargetDialog({ users, teams, currentMonth }: { users: User[]; teams: Team[]; currentMonth: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [dealsTarget, setDealsTarget] = useState("");
  const [leadsTarget, setLeadsTarget] = useState("");
  const [revenueTarget, setRevenueTarget] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (data: object) => {
      return apiRequest("POST", "/api/monthly-targets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-targets-with-achievement"] });
      toast({ title: t.targetSavedSuccess });
      setOpen(false);
      setSelectedUser("");
      setDealsTarget("");
      setLeadsTarget("");
      setRevenueTarget("");
    },
    onError: () => {
      toast({ title: t.targetSavedError, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    saveMutation.mutate({
      userId: selectedUser,
      targetMonth: currentMonth,
      dealsTarget: Number(dealsTarget) || 0,
      leadsTarget: Number(leadsTarget) || 0,
      revenueTarget: revenueTarget ? Number(revenueTarget) : null,
    });
  };

  const agents = users.filter(u => u.role === "sales_agent" || u.role === "team_leader");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-set-targets">
          <Settings className="h-4 w-4 mr-2" />
          {t.setTargets}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.setTargets}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t.setTargetsSubtitle} — {currentMonth}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.agent}</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger data-testid="select-target-user">
                <SelectValue placeholder={t.selectSalesAgent} />
              </SelectTrigger>
              <SelectContent>
                {agents.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                    {u.teamId && teams.find(t => t.id === u.teamId) ? ` (${teams.find(t => t.id === u.teamId)?.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dealsTarget">{t.dealsTarget}</Label>
              <Input
                id="dealsTarget"
                type="number"
                min="0"
                value={dealsTarget}
                onChange={e => setDealsTarget(e.target.value)}
                placeholder="0"
                data-testid="input-deals-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadsTarget">{t.leadsTarget}</Label>
              <Input
                id="leadsTarget"
                type="number"
                min="0"
                value={leadsTarget}
                onChange={e => setLeadsTarget(e.target.value)}
                placeholder="0"
                data-testid="input-leads-target"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="revenueTarget">{t.revenueTarget}</Label>
            <Input
              id="revenueTarget"
              type="number"
              min="0"
              value={revenueTarget}
              onChange={e => setRevenueTarget(e.target.value)}
              placeholder="0"
              data-testid="input-revenue-target"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!selectedUser || saveMutation.isPending} data-testid="button-save-target">
            {saveMutation.isPending ? t.saving : t.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LeaderboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role ?? "sales_agent";
  // Roles that can see team achievement data
  const isManager = role === "super_admin" || role === "admin" || role === "sales_admin" || role === "team_leader" || role === "company_owner" || role === "sales_manager";
  // Roles that can set targets (those who manage sales teams and have canManageTeams permission)
  const canSetTargets = role === "super_admin" || role === "admin" || role === "sales_admin" || role === "sales_manager";

  const today = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"deals" | "leads">("deals");

  const getResolvedPeriod = () => {
    if (selectedPeriod === "current_month") return getCurrentMonth();
    if (selectedPeriod === "previous_month") return getPreviousMonth();
    if (selectedPeriod === "current_year") return String(today.getFullYear());
    return getCurrentMonth();
  };

  const resolvedPeriod = getResolvedPeriod();
  const isYearFilter = selectedPeriod === "current_year";

  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", resolvedPeriod, selectedTeam !== "all" ? selectedTeam : undefined],
    queryFn: async () => {
      const params = new URLSearchParams({ period: resolvedPeriod });
      if (selectedTeam !== "all") params.set("teamId", selectedTeam);
      const res = await fetch(`/api/leaderboard?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: targetsWithAchievement = [] } = useQuery<TargetEntry[]>({
    queryKey: ["/api/monthly-targets-with-achievement", resolvedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({ month: isYearFilter ? getCurrentMonth() : resolvedPeriod });
      const res = await fetch(`/api/monthly-targets-with-achievement?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isManager && !isYearFilter,
  });

  const filteredLeaderboard = leaderboard
    .filter(entry => selectedTeam === "all" || entry.teamId === selectedTeam)
    .sort((a, b) => sortBy === "deals" ? b.dealsCount - a.dealsCount : b.leadsCount - a.leadsCount);

  const filteredTargets = targetsWithAchievement
    .filter(entry => selectedTeam === "all" || entry.teamId === selectedTeam);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-leaderboard-title">{t.leaderboard}</h1>
          <p className="text-muted-foreground">{t.leaderboardSubtitle}</p>
        </div>
        {canSetTargets && (
          <SetTargetDialog users={users as User[]} teams={teams} currentMonth={getCurrentMonth()} />
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-44" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">{t.currentMonth}</SelectItem>
            <SelectItem value="previous_month">{t.previousMonth}</SelectItem>
            <SelectItem value="current_year">{t.currentYear}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-44" data-testid="select-team-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allTeams}</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "deals" | "leads")}>
          <SelectTrigger className="w-48" data-testid="select-sort-by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deals">{t.sortByDeals}</SelectItem>
            <SelectItem value="leads">{t.sortByLeads}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredLeaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            {t.noLeaderboardData}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="leaderboard-list">
          {filteredLeaderboard.map((entry, idx) => {
            const rank = idx + 1;
            const medalOrRank = getMedalOrRank(rank);
            const isTop3 = rank <= 3;

            const targetData = targetsWithAchievement.find(t => t.userId === entry.userId);
            const dealsTarget = targetData?.dealsTarget ?? 0;
            const leadsTarget = targetData?.leadsTarget ?? 0;

            const dealsPct = dealsTarget > 0 ? Math.min(100, Math.round((entry.dealsCount / dealsTarget) * 100)) : 0;
            const leadsPct = leadsTarget > 0 ? Math.min(100, Math.round((entry.leadsCount / leadsTarget) * 100)) : 0;

            return (
              <Card
                key={entry.userId}
                className={`transition-all ${isTop3 ? "border-2" : ""} ${rank === 1 ? "border-yellow-400 bg-yellow-50/30 dark:bg-yellow-950/10" : rank === 2 ? "border-gray-300 bg-gray-50/30 dark:bg-gray-900/10" : rank === 3 ? "border-amber-600 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}
                data-testid={`card-leaderboard-${entry.userId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl w-10 text-center shrink-0" data-testid={`text-rank-${entry.userId}`}>
                      {medalOrRank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate" data-testid={`text-agent-name-${entry.userId}`}>{entry.userName}</span>
                        {entry.teamName && (
                          <Badge variant="outline" className="text-xs shrink-0">{entry.teamName}</Badge>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{t.dealsAchieved}</span>
                            <span data-testid={`text-deals-${entry.userId}`}>{entry.dealsCount}{dealsTarget > 0 ? ` / ${dealsTarget}` : ""}</span>
                          </div>
                          {dealsTarget > 0 && (
                            <Progress value={dealsPct} className="h-1.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{t.leadsAchieved}</span>
                            <span data-testid={`text-leads-${entry.userId}`}>{entry.leadsCount}{leadsTarget > 0 ? ` / ${leadsTarget}` : ""}</span>
                          </div>
                          {leadsTarget > 0 && (
                            <Progress value={leadsPct} className="h-1.5" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={entry.dealsCount > 0 ? "default" : "secondary"} data-testid={`text-deals-badge-${entry.userId}`}>
                        {entry.dealsCount} {t.deals}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isManager && filteredTargets.length > 0 && (
        <Card data-testid="card-team-achievement">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t.teamAchievement}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t.teamAchievementSubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-2 px-2 font-medium">{t.memberName}</th>
                    <th className="text-center py-2 px-2 font-medium">{t.dealsAchieved}</th>
                    <th className="text-center py-2 px-2 font-medium">{t.dealsTarget}</th>
                    <th className="text-center py-2 px-2 font-medium">{t.leadsAchieved}</th>
                    <th className="text-center py-2 px-2 font-medium">{t.leadsTarget}</th>
                    <th className="text-center py-2 px-2 font-medium">{t.achievementRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTargets.map(entry => {
                    const dealsPct = entry.dealsTarget > 0 ? Math.min(100, Math.round((entry.dealsCount / entry.dealsTarget) * 100)) : 0;
                    const leadsPct = entry.leadsTarget > 0 ? Math.min(100, Math.round((entry.leadsCount / entry.leadsTarget) * 100)) : 0;
                    const avgPct = entry.dealsTarget > 0 && entry.leadsTarget > 0 ? Math.round((dealsPct + leadsPct) / 2) : (entry.dealsTarget > 0 ? dealsPct : leadsPct);
                    return (
                      <tr key={entry.userId} className="border-b last:border-0" data-testid={`row-achievement-${entry.userId}`}>
                        <td className="py-2 px-2 font-medium">{entry.userName}</td>
                        <td className="text-center py-2 px-2">
                          <Badge variant={entry.dealsCount >= entry.dealsTarget && entry.dealsTarget > 0 ? "default" : "secondary"}>
                            {entry.dealsCount}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-2">{entry.dealsTarget || t.noTargetSet}</td>
                        <td className="text-center py-2 px-2">
                          <Badge variant="outline">{entry.leadsCount}</Badge>
                        </td>
                        <td className="text-center py-2 px-2">{entry.leadsTarget || t.noTargetSet}</td>
                        <td className="text-center py-2 px-2">
                          {(entry.dealsTarget > 0 || entry.leadsTarget > 0) ? (
                            <Badge variant={avgPct >= 100 ? "default" : avgPct >= 50 ? "secondary" : "destructive"}>
                              {avgPct}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">{t.noTargetSet}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
