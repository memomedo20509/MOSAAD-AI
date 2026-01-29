import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, TrendingUp, Target, BarChart3, PieChart, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useState, useMemo } from "react";
import type { Lead, LeadState, User } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6"];

export default function ReportsPage() {
  const { t, isRTL } = useLanguage();
  const [timeRange, setTimeRange] = useState<string>("month");

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: states = [], isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last30":
        return { start: subDays(now, 30), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const filteredLeads = useMemo(() => {
    const { start, end } = getDateRange();
    return leads.filter((lead) => {
      if (!lead.createdAt) return false;
      return isWithinInterval(new Date(lead.createdAt), { start, end });
    });
  }, [leads, timeRange]);

  const leadsBySource = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const source = lead.channel || "Unknown";
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });
    return Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  const leadsByState = useMemo(() => {
    const stateMap: Record<string, { count: number; color: string }> = {};
    filteredLeads.forEach((lead) => {
      const state = states.find((s) => s.id === lead.stateId);
      const stateName = state?.name || "Unassigned";
      const stateColor = state?.color || "#94a3b8";
      if (!stateMap[stateName]) {
        stateMap[stateName] = { count: 0, color: stateColor };
      }
      stateMap[stateName].count++;
    });
    return Object.entries(stateMap).map(([name, { count, color }]) => ({
      name,
      value: count,
      color,
    }));
  }, [filteredLeads, states]);

  const leadsByAgent = useMemo(() => {
    const agentMap: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const agent = users.find((u) => u.id === lead.assignedTo);
      const agentName = agent
        ? `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username
        : "Unassigned";
      agentMap[agentName] = (agentMap[agentName] || 0) + 1;
    });
    return Object.entries(agentMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads, users]);

  const conversionData = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const doneDealState = states.find(
      (s) => s.name.toLowerCase().includes("done") || s.name.toLowerCase().includes("closed") || s.name.includes("صفقة")
    );
    const convertedLeads = filteredLeads.filter((l) => l.stateId === doneDealState?.id).length;
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";
    return { totalLeads, convertedLeads, conversionRate };
  }, [filteredLeads, states]);

  const dailyLeadsTrend = useMemo(() => {
    const { start, end } = getDateRange();
    const dayMap: Record<string, number> = {};
    
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dayMap[format(currentDate, "MM/dd")] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    filteredLeads.forEach((lead) => {
      if (lead.createdAt) {
        const day = format(new Date(lead.createdAt), "MM/dd");
        if (dayMap[day] !== undefined) {
          dayMap[day]++;
        }
      }
    });

    return Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  }, [filteredLeads, timeRange]);

  if (leadsLoading || statesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-reports-title">
            {t.reportsTitle}
          </h1>
          <p className="text-muted-foreground">{t.reportsSubtitle}</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]" data-testid="select-time-range">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t.thisWeek}</SelectItem>
            <SelectItem value="month">{t.thisMonth}</SelectItem>
            <SelectItem value="last30">{t.lastMonth}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.totalLeads}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLeads.length}</div>
            <p className="text-xs text-muted-foreground">{t.thisMonth}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-converted-leads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.totalDeals}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionData.convertedLeads}</div>
            <p className="text-xs text-muted-foreground">{t.dealsThisMonth}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-conversion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.conversionRate}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionData.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {conversionData.convertedLeads} / {conversionData.totalLeads}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-sources">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">{t.leadsBySource}</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsBySource.length}</div>
            <p className="text-xs text-muted-foreground">{t.allChannels}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="chart-leads-trend">
          <CardHeader>
            <CardTitle className="text-base">{t.salesPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyLeadsTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1" }}
                    name={t.leads}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-leads-by-source">
          <CardHeader>
            <CardTitle className="text-base">{t.leadsBySource}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={leadsBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {leadsBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-leads-by-state">
          <CardHeader>
            <CardTitle className="text-base">{t.statesManagement}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByState} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {leadsByState.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-leads-by-agent">
          <CardHeader>
            <CardTitle className="text-base">{t.leadsByAgent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByAgent}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name={t.leads} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-agent-performance">
        <CardHeader>
          <CardTitle className="text-base">{t.salesRepresentatives}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-start py-3 px-2 font-medium">{t.assignedTo}</th>
                  <th className="text-center py-3 px-2 font-medium">{t.totalLeads}</th>
                  <th className="text-center py-3 px-2 font-medium">{t.totalDeals}</th>
                  <th className="text-center py-3 px-2 font-medium">{t.conversionRate}</th>
                </tr>
              </thead>
              <tbody>
                {leadsByAgent.map((agent, idx) => {
                  const agentLeads = filteredLeads.filter((l) => {
                    const u = users.find((u) => u.id === l.assignedTo);
                    const agentName = u
                      ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
                      : "Unassigned";
                    return agentName === agent.name;
                  });
                  const doneDealState = states.find(
                    (s) =>
                      s.name.toLowerCase().includes("done") ||
                      s.name.toLowerCase().includes("closed") ||
                      s.name.includes("صفقة")
                  );
                  const deals = agentLeads.filter((l) => l.stateId === doneDealState?.id).length;
                  const rate = agent.count > 0 ? ((deals / agent.count) * 100).toFixed(1) : "0";
                  return (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-3 px-2">{agent.name}</td>
                      <td className="text-center py-3 px-2">{agent.count}</td>
                      <td className="text-center py-3 px-2">{deals}</td>
                      <td className="text-center py-3 px-2">
                        <Badge variant={Number(rate) >= 20 ? "default" : "secondary"}>{rate}%</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
