import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Users, TrendingUp, Target, BarChart3, PieChart, Calendar, Clock,
  AlertTriangle, Zap, Download, TrendingDown, FileText, Phone, MessageSquare,
  UserCheck, Snowflake, Building2, Activity,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6"];

function formatResponseTime(minutes: number | null, minutesAbbr: string, hoursAbbr: string): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} ${minutesAbbr}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}${hoursAbbr} ${m}${minutesAbbr}` : `${h}${hoursAbbr}`;
}

type MarketingRow = {
  source: string;
  leadCount: number;
  convertedCount: number;
  conversionRate: number;
  totalMarketingCost: number;
  totalRevenue: number;
  avgDealValue: number | null;
  roi: number | null;
  costPerLead: number;
  costPerConversion: number | null;
};

type SalesActivityRow = {
  agentId: string;
  agentName: string;
  callsCount: number;
  whatsappCount: number;
  meetingsCount: number;
  notesCount: number;
  totalActions: number;
  callsToMeetingRate: number;
  inboundWhatsappCount: number;
  outboundWhatsappCount: number;
  whatsappReplyRate: number;
  weekCallsCount: number;
  weekMeetingsCount: number;
  weekTotalActions: number;
  monthCallsCount: number;
  monthMeetingsCount: number;
  monthTotalActions: number;
};

type FollowUpRow = {
  agentId: string;
  agentName: string;
  scheduledFollowUps: number;
  overdueFollowUps: number;
  completedFollowUps: number;
  followUpRate: number;
  neverContactedLeads: number;
  within24hLeads: number;
  within48hLeads: number;
  meetingsHeld: number;
  meetingsAttendanceRate: number;
};

type FunnelRow = {
  stateId: string;
  stateName: string;
  stateColor: string;
  stateOrder: number;
  count: number;
  conversionToNext: number | null;
  avgDaysInState: number | null;
};

type DailyActivityRow = {
  agentId: string;
  agentName: string;
  todayActions: number;
  weekActions: number;
  todayCalls: number;
  todayWhatsapp: number;
  todayMeetings: number;
  todayNotes: number;
  isInactive: boolean;
  lastActivityAt: string | null;
};

type ColdLeadRow = {
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  agentId: string | null;
  agentName: string | null;
  lastContactDate: string | null;
  daysSinceContact: number;
  stateId: string | null;
  stateName: string | null;
};

type ProjectPerformanceRow = {
  projectId: string;
  projectName: string;
  totalLeads: number;
  bookingsCount: number;
  conversionRate: number;
  avgDaysToClose: number | null;
};

type ComparisonRow = {
  period: string;
  label: string;
  newLeads: number;
  meetings: number;
  bookings: number;
  totalActions: number;
};

export default function ReportsPage() {
  const { t, isRTL, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<string>("month");
  const [marketingTimeRange, setMarketingTimeRange] = useState<string>("month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [pdfExporting, setPdfExporting] = useState(false);
  const [coldLeadsFilter, setColdLeadsFilter] = useState<string>("all");
  const [reassigningLeadId, setReassigningLeadId] = useState<string | null>(null);
  const [reassignAgentId, setReassignAgentId] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: states = [], isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const isManager =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "sales_manager" ||
    user?.role === "company_owner";

  const { data: responseTimeReport = [] } = useQuery<{
    agentId: string;
    agentName: string;
    avgResponseMinutes: number | null;
    fastestResponseMinutes: number | null;
    slowestResponseMinutes: number | null;
    uncontactedCount: number;
  }[]>({
    queryKey: ["/api/reports/response-time"],
    enabled: isManager,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: salesActivityReport = [], isLoading: salesActivityLoading } = useQuery<SalesActivityRow[]>({
    queryKey: ["/api/reports/sales-activity"],
    enabled: isManager,
  });

  const { data: followUpReport = [], isLoading: followUpLoading } = useQuery<FollowUpRow[]>({
    queryKey: ["/api/reports/followup"],
    enabled: isManager,
  });

  const { data: funnelReport = [], isLoading: funnelLoading } = useQuery<FunnelRow[]>({
    queryKey: ["/api/reports/funnel"],
    enabled: isManager,
  });

  const { data: dailyActivityReport = [], isLoading: dailyActivityLoading } = useQuery<DailyActivityRow[]>({
    queryKey: ["/api/reports/daily-activity"],
    enabled: isManager,
    refetchInterval: 60000,
  });

  const { data: coldLeadsReport = [], isLoading: coldLeadsLoading } = useQuery<ColdLeadRow[]>({
    queryKey: ["/api/reports/cold-leads"],
    enabled: isManager,
  });

  const { data: projectPerformanceReport = [], isLoading: projectLoading } = useQuery<ProjectPerformanceRow[]>({
    queryKey: ["/api/reports/project-performance"],
    enabled: isManager,
  });

  const { data: comparisonReport = [], isLoading: comparisonLoading } = useQuery<ComparisonRow[]>({
    queryKey: ["/api/reports/comparison"],
    enabled: isManager,
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      return apiRequest("PATCH", `/api/leads/${leadId}/reassign`, { assignedTo: agentId });
    },
    onSuccess: () => {
      toast({ title: t.reassignSuccess });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/cold-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setReassigningLeadId(null);
      setReassignAgentId("");
    },
    onError: () => {
      toast({ title: t.reassignError, variant: "destructive" });
    },
  });

  const getMarketingDateRange = () => {
    const now = new Date();
    switch (marketingTimeRange) {
      case "week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "lastMonth": {
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      }
      case "quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "custom":
        return {
          start: customFrom ? new Date(customFrom) : startOfMonth(now),
          end: customTo ? new Date(customTo) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const marketingApiParams = useMemo(() => {
    const { start, end } = getMarketingDateRange();
    return `?from=${start.toISOString()}&to=${end.toISOString()}`;
  }, [marketingTimeRange, customFrom, customTo]);

  const { data: marketingData = [], isLoading: marketingLoading } = useQuery<MarketingRow[]>({
    queryKey: ["/api/reports/marketing", marketingApiParams],
    queryFn: async () => {
      const res = await fetch(`/api/reports/marketing${marketingApiParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch marketing data");
      return res.json();
    },
    enabled: isManager,
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

  const filteredColdLeads = useMemo(() => {
    if (coldLeadsFilter === "all") return coldLeadsReport;
    if (coldLeadsFilter === "3") return coldLeadsReport.filter(l => l.daysSinceContact >= 3);
    if (coldLeadsFilter === "7") return coldLeadsReport.filter(l => l.daysSinceContact >= 7);
    if (coldLeadsFilter === "14") return coldLeadsReport.filter(l => l.daysSinceContact >= 14);
    return coldLeadsReport;
  }, [coldLeadsReport, coldLeadsFilter]);

  const handleExportPDF = async () => {
    setPdfExporting(true);
    try {
      const { generateReportPdf } = await import("@/lib/report-pdf");

      const isAr = language === "ar";
      const doneDealState = states.find(
        (s) =>
          s.name.toLowerCase().includes("done") ||
          s.name.toLowerCase().includes("closed") ||
          s.name.includes("صفقة")
      );

      const agentsData = leadsByAgent.map((agent) => {
        const agentLeads = filteredLeads.filter((l) => {
          const u = users.find((u) => u.id === l.assignedTo);
          const agentName =
            u
              ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
              : "Unassigned";
          return agentName === agent.name;
        });
        const deals = agentLeads.filter(
          (l) => l.stateId === doneDealState?.id
        ).length;
        const rate =
          agent.count > 0
            ? `${((deals / agent.count) * 100).toFixed(1)}%`
            : "0%";
        return { name: agent.name, count: agent.count, deals, rate };
      });

      await generateReportPdf(
        {
          totalLeads: conversionData.totalLeads,
          closedDeals: conversionData.convertedLeads,
          conversionRate: conversionData.conversionRate,
          sources: leadsBySource,
          agents: agentsData,
          generatedAt: new Date(),
        },
        isAr ? "ar" : "en",
        `report-${format(new Date(), "yyyy-MM-dd")}.pdf`
      );

      toast({ title: t.pdfExportSuccess });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: t.pdfExportError, variant: "destructive" });
    } finally {
      setPdfExporting(false);
    }
  };

  const handleExportMarketing = () => {
    import("xlsx").then((XLSX) => {
      const rows = marketingData.map((row) => ({
        [t.source]: row.source,
        [t.totalLeads]: row.leadCount,
        [t.converted]: row.convertedCount,
        [t.conversionRate]: `${row.conversionRate}%`,
        [t.totalMarketingCost]: row.totalMarketingCost,
        [t.totalRevenue]: row.totalRevenue,
        [t.avgDealValue]: row.avgDealValue ?? "—",
        [t.costPerLead]: row.costPerLead,
        [t.costPerConversion]: row.costPerConversion ?? "—",
        [t.roi]: row.roi !== null ? `${row.roi}%` : "—",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t.marketingAnalytics);
      XLSX.writeFile(wb, `marketing-analytics-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    });
  };

  if (leadsLoading || statesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const salesAgents = users.filter(u => u.role === "sales_agent" || u.role === "team_leader");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-reports-title">
            {t.reportsTitle}
          </h1>
          <p className="text-muted-foreground">{t.reportsSubtitle}</p>
        </div>
        {isManager && (
          <Button
            onClick={handleExportPDF}
            disabled={pdfExporting}
            data-testid="button-export-pdf"
          >
            {pdfExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {pdfExporting ? t.exportingPDF : t.exportPDF}
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="overview" data-testid="tab-reports-overview">
            <BarChart3 className="h-4 w-4 mr-1" />
            {t.overview}
          </TabsTrigger>
          {isManager && (
            <>
              <TabsTrigger value="sales-activity" data-testid="tab-sales-activity">
                <Phone className="h-4 w-4 mr-1" />
                {t.salesActivityTab}
              </TabsTrigger>
              <TabsTrigger value="followup" data-testid="tab-followup">
                <UserCheck className="h-4 w-4 mr-1" />
                {t.followUpTab}
              </TabsTrigger>
              <TabsTrigger value="funnel" data-testid="tab-funnel">
                <Activity className="h-4 w-4 mr-1" />
                {t.funnelTab}
              </TabsTrigger>
              <TabsTrigger value="daily-activity" data-testid="tab-daily-activity">
                <Zap className="h-4 w-4 mr-1" />
                {t.dailyActivityTab}
              </TabsTrigger>
              <TabsTrigger value="cold-leads" data-testid="tab-cold-leads">
                <Snowflake className="h-4 w-4 mr-1" />
                {t.coldLeadsTab}
              </TabsTrigger>
              <TabsTrigger value="projects" data-testid="tab-projects">
                <Building2 className="h-4 w-4 mr-1" />
                {t.projectPerformanceTab}
              </TabsTrigger>
              <TabsTrigger value="comparison" data-testid="tab-comparison">
                <TrendingUp className="h-4 w-4 mr-1" />
                {t.comparisonTab}
              </TabsTrigger>
              <TabsTrigger value="marketing" data-testid="tab-reports-marketing">
                <PieChart className="h-4 w-4 mr-1" />
                {t.marketingTab}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ============================== OVERVIEW TAB ============================== */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="flex justify-end">
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

          <Card data-testid="table-response-time">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                {t.responseTimeReport}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t.responseTimeSubtitle}</p>
            </CardHeader>
            <CardContent>
              {responseTimeReport.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-muted-foreground">
                  {t.noResponseData}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-2 font-medium">{t.assignedTo}</th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {t.avgResponseTime}
                          </span>
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="flex items-center justify-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-green-500" />
                            {t.fastestResponse}
                          </span>
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-orange-500" />
                            {t.slowestResponse}
                          </span>
                        </th>
                        <th className="text-center py-3 px-2 font-medium">
                          <span className="flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            {t.uncontactedLeads}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {responseTimeReport.map((row) => (
                        <tr key={row.agentId} className="border-b last:border-0" data-testid={`row-response-time-${row.agentId}`}>
                          <td className="py-3 px-2 font-medium">{row.agentName}</td>
                          <td className="text-center py-3 px-2">
                            <Badge variant={row.avgResponseMinutes === null ? "secondary" : row.avgResponseMinutes <= 60 ? "default" : "outline"}>
                              {formatResponseTime(row.avgResponseMinutes, t.minutesAbbr, t.hoursAbbr)}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-2 text-green-600">
                            {formatResponseTime(row.fastestResponseMinutes, t.minutesAbbr, t.hoursAbbr)}
                          </td>
                          <td className="text-center py-3 px-2 text-orange-600">
                            {formatResponseTime(row.slowestResponseMinutes, t.minutesAbbr, t.hoursAbbr)}
                          </td>
                          <td className="text-center py-3 px-2">
                            {row.uncontactedCount > 0 ? (
                              <Badge variant="destructive">{row.uncontactedCount}</Badge>
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
        </TabsContent>

        {/* ============================== SALES ACTIVITY TAB ============================== */}
        {isManager && (
          <TabsContent value="sales-activity" className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold">{t.salesActivityTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.salesActivitySubtitle}</p>
            </div>
            {salesActivityLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : salesActivityReport.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noActivityData}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card data-testid="chart-sales-activity-calls">
                    <CardHeader>
                      <CardTitle className="text-base">{t.callsCount} & {t.meetingsCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesActivityReport}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="agentName" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="callsCount" fill="#6366f1" name={t.callsCount} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="meetingsCount" fill="#22c55e" name={t.meetingsCount} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="chart-sales-activity-whatsapp">
                    <CardHeader>
                      <CardTitle className="text-base">{t.whatsappCount} & {t.whatsappReplyRate}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesActivityReport}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="agentName" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="inboundWhatsappCount" fill="#25d366" name={t.inboundWhatsapp} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="outboundWhatsappCount" fill="#128c7e" name={t.outboundWhatsapp} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="table-sales-activity">
                  <CardHeader>
                    <CardTitle className="text-base">{t.salesActivityTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-3 px-2 font-medium" rowSpan={2}>{t.assignedTo}</th>
                            <th className="text-center py-2 px-2 font-medium border-b" colSpan={5}>{t.periodCurrent}</th>
                            <th className="text-center py-2 px-2 font-medium border-b border-l" colSpan={3}>{t.periodWeek}</th>
                            <th className="text-center py-2 px-2 font-medium border-b border-l" colSpan={3}>{t.periodMonth}</th>
                          </tr>
                          <tr className="border-b">
                            <th className="text-center py-2 px-2 font-medium">{t.callsCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.whatsappCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.meetingsCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.callsToMeetingRate}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.whatsappReplyRate}</th>
                            <th className="text-center py-2 px-2 font-medium border-l">{t.callsCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.meetingsCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.totalActions}</th>
                            <th className="text-center py-2 px-2 font-medium border-l">{t.callsCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.meetingsCount}</th>
                            <th className="text-center py-2 px-2 font-medium">{t.totalActions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesActivityReport.map((row) => (
                            <tr key={row.agentId} className="border-b last:border-0" data-testid={`row-sales-activity-${row.agentId}`}>
                              <td className="py-3 px-2 font-medium">{row.agentName}</td>
                              <td className="text-center py-3 px-2">{row.callsCount}</td>
                              <td className="text-center py-3 px-2">{row.whatsappCount}</td>
                              <td className="text-center py-3 px-2">{row.meetingsCount}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.callsToMeetingRate >= 20 ? "default" : "secondary"}>
                                  {row.callsToMeetingRate}%
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.inboundWhatsappCount > 0 ? (
                                  <Badge variant={row.whatsappReplyRate >= 80 ? "default" : row.whatsappReplyRate >= 50 ? "outline" : "secondary"}>
                                    {row.whatsappReplyRate}%
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="text-center py-3 px-2 border-l">{row.weekCallsCount}</td>
                              <td className="text-center py-3 px-2">{row.weekMeetingsCount}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.weekTotalActions >= 20 ? "default" : row.weekTotalActions >= 10 ? "outline" : "secondary"}>
                                  {row.weekTotalActions}
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2 border-l">{row.monthCallsCount}</td>
                              <td className="text-center py-3 px-2">{row.monthMeetingsCount}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.monthTotalActions >= 50 ? "default" : row.monthTotalActions >= 20 ? "outline" : "secondary"}>
                                  {row.monthTotalActions}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ============================== FOLLOW-UP TAB ============================== */}
        {isManager && (
          <TabsContent value="followup" className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold">{t.followUpTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.followUpSubtitle}</p>
            </div>
            {followUpLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : followUpReport.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noActivityData}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card data-testid="chart-followup-scheduled">
                    <CardHeader>
                      <CardTitle className="text-base">{t.scheduledFollowUpsCount} vs {t.overdueFollowUps}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={followUpReport}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="agentName" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="scheduledFollowUps" fill="#6366f1" name={t.scheduledFollowUpsCount} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="overdueFollowUps" fill="#f43f5e" name={t.overdueFollowUps} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="completedFollowUps" fill="#22c55e" name={t.completedFollowUps} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="chart-followup-contact">
                    <CardHeader>
                      <CardTitle className="text-base">{t.neverContacted}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={followUpReport}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="agentName" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="neverContactedLeads" fill="#f43f5e" name={t.neverContacted} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="within24hLeads" fill="#22c55e" name={t.contactedWithin24h} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="table-followup">
                  <CardHeader>
                    <CardTitle className="text-base">{t.followUpTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-3 px-2 font-medium">{t.assignedTo}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.scheduledFollowUpsCount}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.overdueFollowUps}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.completedFollowUps}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.followUpRate}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.neverContacted}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.contactedWithin24h}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.contactedWithin48h}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.meetingsHeld}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.meetingsAttendanceRate}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {followUpReport.map((row) => (
                            <tr key={row.agentId} className="border-b last:border-0" data-testid={`row-followup-${row.agentId}`}>
                              <td className="py-3 px-2 font-medium">{row.agentName}</td>
                              <td className="text-center py-3 px-2">{row.scheduledFollowUps}</td>
                              <td className="text-center py-3 px-2">
                                {row.overdueFollowUps > 0 ? (
                                  <Badge variant="destructive">{row.overdueFollowUps}</Badge>
                                ) : (
                                  <Badge variant="secondary">0</Badge>
                                )}
                              </td>
                              <td className="text-center py-3 px-2">{row.completedFollowUps}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.followUpRate >= 70 ? "default" : row.followUpRate >= 40 ? "outline" : "secondary"}>
                                  {row.followUpRate}%
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.neverContactedLeads > 0 ? (
                                  <Badge variant="destructive">{row.neverContactedLeads}</Badge>
                                ) : (
                                  <Badge variant="secondary">0</Badge>
                                )}
                              </td>
                              <td className="text-center py-3 px-2">{row.within24hLeads}</td>
                              <td className="text-center py-3 px-2">{row.within48hLeads}</td>
                              <td className="text-center py-3 px-2">{row.meetingsHeld}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.meetingsAttendanceRate >= 50 ? "default" : "outline"}>
                                  {row.meetingsAttendanceRate}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ============================== SALES FUNNEL TAB ============================== */}
        {isManager && (
          <TabsContent value="funnel" className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold">{t.funnelTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.funnelSubtitle}</p>
            </div>
            {funnelLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : funnelReport.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noFunnelData}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card data-testid="chart-funnel">
                  <CardHeader>
                    <CardTitle className="text-base">{t.funnelTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelReport} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="stateName" type="category" tick={{ fontSize: 12 }} width={120} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} name={t.funnelCount}>
                            {funnelReport.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.stateColor || COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="table-funnel">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-3 px-2 font-medium">{t.funnelStage}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.funnelCount}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.funnelConversion}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.avgDaysInStage}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {funnelReport.map((row, idx) => (
                            <tr key={row.stateId} className="border-b last:border-0" data-testid={`row-funnel-${row.stateId}`}>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: row.stateColor }} />
                                  <span className="font-medium">{row.stateName}</span>
                                </div>
                              </td>
                              <td className="text-center py-3 px-2">
                                <Badge variant="outline">{row.count}</Badge>
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.conversionToNext !== null ? (
                                  <Badge variant={row.conversionToNext >= 30 ? "default" : "secondary"}>
                                    {row.conversionToNext}%
                                  </Badge>
                                ) : "—"}
                              </td>
                              <td className="text-center py-3 px-2 text-muted-foreground">
                                {row.avgDaysInState !== null ? row.avgDaysInState : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ============================== DAILY ACTIVITY TAB ============================== */}
        {isManager && (
          <TabsContent value="daily-activity" className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold">{t.dailyActivityTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.dailyActivitySubtitle}</p>
            </div>
            {dailyActivityLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : dailyActivityReport.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noActivityData}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card data-testid="card-daily-total-actions">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{t.totalActions} ({t.todayActivity})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dailyActivityReport.reduce((s, r) => s + r.todayActions, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-daily-calls">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{t.callsCount} ({t.todayActivity})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dailyActivityReport.reduce((s, r) => s + r.todayCalls, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-daily-meetings">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{t.meetingsCount} ({t.todayActivity})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dailyActivityReport.reduce((s, r) => s + r.todayMeetings, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-daily-inactive">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{t.inactiveWarning}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {dailyActivityReport.filter(r => r.isInactive).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="table-daily-activity">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-3 px-2 font-medium">{t.assignedTo}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.callsCount}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.whatsappCount}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.meetingsCount}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.notesCount}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.todayActivity}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.weekActivity}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.lastActivity}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyActivityReport.map((row) => (
                            <tr
                              key={row.agentId}
                              className={`border-b last:border-0 ${row.isInactive ? "bg-destructive/5" : ""}`}
                              data-testid={`row-daily-activity-${row.agentId}`}
                            >
                              <td className="py-3 px-2 font-medium">
                                <div className="flex items-center gap-2">
                                  {row.isInactive && (
                                    <Badge variant="destructive" className="text-xs">{t.inactiveWarning}</Badge>
                                  )}
                                  {row.agentName}
                                </div>
                              </td>
                              <td className="text-center py-3 px-2">{row.todayCalls}</td>
                              <td className="text-center py-3 px-2">{row.todayWhatsapp}</td>
                              <td className="text-center py-3 px-2">{row.todayMeetings}</td>
                              <td className="text-center py-3 px-2">{row.todayNotes}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.todayActions >= 10 ? "default" : row.todayActions >= 5 ? "outline" : "secondary"}>
                                  {row.todayActions}
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2">{row.weekActions}</td>
                              <td className="text-center py-3 px-2 text-muted-foreground text-xs">
                                {row.lastActivityAt
                                  ? format(new Date(row.lastActivityAt), "MM/dd HH:mm")
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ============================== COLD LEADS TAB ============================== */}
        {isManager && (
          <TabsContent value="cold-leads" className="space-y-6 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{t.coldLeadsTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.coldLeadsSubtitle}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={coldLeadsFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setColdLeadsFilter("all")}
                  data-testid="button-cold-all"
                >
                  {t.allColdLeads}
                </Button>
                <Button
                  variant={coldLeadsFilter === "3" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setColdLeadsFilter("3")}
                  data-testid="button-cold-3days"
                >
                  {t.coldLeads3Days}
                </Button>
                <Button
                  variant={coldLeadsFilter === "7" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setColdLeadsFilter("7")}
                  data-testid="button-cold-7days"
                >
                  {t.coldLeads7Days}
                </Button>
                <Button
                  variant={coldLeadsFilter === "14" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setColdLeadsFilter("14")}
                  data-testid="button-cold-14days"
                >
                  {t.coldLeads14Days}
                </Button>
              </div>
            </div>
            {coldLeadsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredColdLeads.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noColdLeadsData}
                </CardContent>
              </Card>
            ) : (
              <Card data-testid="table-cold-leads">
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-start py-3 px-2 font-medium">{t.name}</th>
                          <th className="text-center py-3 px-2 font-medium">{t.phone}</th>
                          <th className="text-center py-3 px-2 font-medium">{t.assignedTo}</th>
                          <th className="text-center py-3 px-2 font-medium">{t.lastContactDate}</th>
                          <th className="text-center py-3 px-2 font-medium">{t.daysSinceContact}</th>
                          <th className="text-center py-3 px-2 font-medium">{t.leadStatus}</th>
                          <th className="text-center py-3 px-2 font-medium">{t.reassign}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredColdLeads.map((row) => (
                          <tr key={row.leadId} className="border-b last:border-0" data-testid={`row-cold-lead-${row.leadId}`}>
                            <td className="py-3 px-2 font-medium">{row.leadName || t.noName}</td>
                            <td className="text-center py-3 px-2 text-muted-foreground">{row.leadPhone || "—"}</td>
                            <td className="text-center py-3 px-2">{row.agentName || "—"}</td>
                            <td className="text-center py-3 px-2 text-muted-foreground text-xs">
                              {row.lastContactDate
                                ? format(new Date(row.lastContactDate), "MM/dd/yyyy")
                                : "—"}
                            </td>
                            <td className="text-center py-3 px-2">
                              <Badge variant={row.daysSinceContact >= 14 ? "destructive" : row.daysSinceContact >= 7 ? "outline" : "secondary"}>
                                {row.daysSinceContact}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-2">
                              <Badge variant="outline">{row.stateName || "—"}</Badge>
                            </td>
                            <td className="text-center py-3 px-2">
                              {reassigningLeadId === row.leadId ? (
                                <div className="flex items-center gap-2">
                                  <Select value={reassignAgentId} onValueChange={setReassignAgentId}>
                                    <SelectTrigger className="h-7 w-[140px]" data-testid={`select-reassign-agent-${row.leadId}`}>
                                      <SelectValue placeholder={t.selectAgent} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {salesAgents.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                          {`${a.firstName || ""} ${a.lastName || ""}`.trim() || a.username}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    className="h-7"
                                    onClick={() => {
                                      if (reassignAgentId) {
                                        reassignMutation.mutate({ leadId: row.leadId, agentId: reassignAgentId });
                                      }
                                    }}
                                    disabled={!reassignAgentId || reassignMutation.isPending}
                                    data-testid={`button-confirm-reassign-${row.leadId}`}
                                  >
                                    {reassignMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "✓"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7"
                                    onClick={() => { setReassigningLeadId(null); setReassignAgentId(""); }}
                                    data-testid={`button-cancel-reassign-${row.leadId}`}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7"
                                  onClick={() => setReassigningLeadId(row.leadId)}
                                  data-testid={`button-reassign-${row.leadId}`}
                                >
                                  {t.reassign}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ============================== PROJECT PERFORMANCE TAB ============================== */}
        {isManager && (
          <TabsContent value="projects" className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold">{t.projectPerformanceTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.projectPerformanceSubtitle}</p>
            </div>
            {projectLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projectPerformanceReport.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noProjectData}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card data-testid="chart-project-leads">
                    <CardHeader>
                      <CardTitle className="text-base">{t.totalLeads} / {t.bookings}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={projectPerformanceReport.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="projectName" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="totalLeads" fill="#6366f1" name={t.totalLeads} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="bookingsCount" fill="#22c55e" name={t.bookings} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="chart-project-conversion">
                    <CardHeader>
                      <CardTitle className="text-base">{t.conversionRate}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={projectPerformanceReport.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="projectName" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 12 }} unit="%" />
                            <Tooltip formatter={(v) => [`${v}%`, t.conversionRate]} />
                            <Bar dataKey="conversionRate" fill="#f97316" radius={[4, 4, 0, 0]} name={t.conversionRate} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="table-project-performance">
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-3 px-2 font-medium">{t.project}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.totalLeads}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.bookings}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.conversionRate}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.avgDaysToClose}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectPerformanceReport.map((row) => (
                            <tr key={row.projectId} className="border-b last:border-0" data-testid={`row-project-${row.projectId}`}>
                              <td className="py-3 px-2 font-medium">{row.projectName}</td>
                              <td className="text-center py-3 px-2">{row.totalLeads}</td>
                              <td className="text-center py-3 px-2">{row.bookingsCount}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.conversionRate >= 20 ? "default" : "secondary"}>
                                  {row.conversionRate}%
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.avgDaysToClose !== null ? `${row.avgDaysToClose} ${t.responseTimeMinutes}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* ============================== COMPARISON TAB ============================== */}
        {isManager && (
          <TabsContent value="comparison" className="space-y-6 mt-4">
            <div>
              <h2 className="text-lg font-semibold">{t.comparisonTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.comparisonSubtitle}</p>
            </div>
            {comparisonLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : comparisonReport.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noComparisonData}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {comparisonReport.map((row) => (
                    <Card key={row.period} data-testid={`card-comparison-${row.period}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {row.label === "lastWeek" ? t.lastWeek :
                           row.label === "thisWeek" ? t.periodWeek :
                           row.label === "lastMonth" ? t.lastMonth :
                           row.label === "thisMonth" ? t.periodMonth :
                           row.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.newLeadsCount}</span>
                            <span className="font-semibold">{row.newLeads}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.meetingsCount}</span>
                            <span className="font-semibold">{row.meetings}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.bookings}</span>
                            <span className="font-semibold">{row.bookings}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.totalActionsCount}</span>
                            <span className="font-semibold">{row.totalActions}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card data-testid="chart-comparison-leads">
                    <CardHeader>
                      <CardTitle className="text-base">{t.newLeadsCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonReport.map(r => ({
                            ...r,
                            translatedLabel: r.label === "lastWeek" ? t.lastWeek : r.label === "thisWeek" ? t.periodWeek : r.label === "lastMonth" ? t.lastMonth : t.periodMonth,
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="translatedLabel" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="newLeads" fill="#6366f1" radius={[4, 4, 0, 0]} name={t.newLeadsCount} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="chart-comparison-actions">
                    <CardHeader>
                      <CardTitle className="text-base">{t.meetingsCount} & {t.bookings}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={comparisonReport.map(r => ({
                            ...r,
                            translatedLabel: r.label === "lastWeek" ? t.lastWeek : r.label === "thisWeek" ? t.periodWeek : r.label === "lastMonth" ? t.lastMonth : t.periodMonth,
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="translatedLabel" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="meetings" fill="#22c55e" radius={[4, 4, 0, 0]} name={t.meetingsCount} />
                            <Bar dataKey="bookings" fill="#f97316" radius={[4, 4, 0, 0]} name={t.bookings} />
                            <Bar dataKey="totalActions" fill="#6366f1" radius={[4, 4, 0, 0]} name={t.totalActionsCount} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        )}

        {/* ============================== MARKETING TAB ============================== */}
        {isManager && (
          <TabsContent value="marketing" className="space-y-6 mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t.marketingAnalytics}</h2>
                <p className="text-sm text-muted-foreground">{t.marketingAnalyticsSubtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <Select value={marketingTimeRange} onValueChange={setMarketingTimeRange}>
                  <SelectTrigger className="w-[180px]" data-testid="select-marketing-time-range">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">{t.thisWeek}</SelectItem>
                    <SelectItem value="month">{t.thisMonth}</SelectItem>
                    <SelectItem value="lastMonth">{t.lastMonth}</SelectItem>
                    <SelectItem value="quarter">{t.thisQuarter}</SelectItem>
                    <SelectItem value="custom">{t.customRange}</SelectItem>
                  </SelectContent>
                </Select>
                {marketingTimeRange === "custom" && (
                  <>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-[150px]"
                      data-testid="input-marketing-from"
                    />
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-[150px]"
                      data-testid="input-marketing-to"
                    />
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={handleExportMarketing}
                  disabled={marketingData.length === 0}
                  data-testid="button-export-marketing"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.exportExcel}
                </Button>
              </div>
            </div>

            {marketingLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : marketingData.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
                  {t.noMarketingData}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card data-testid="card-marketing-total-leads">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-sm font-medium">{t.totalLeads}</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {marketingData.reduce((s, r) => s + r.leadCount, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-marketing-total-converted">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-sm font-medium">{t.converted}</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {marketingData.reduce((s, r) => s + r.convertedCount, 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-marketing-total-cost">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-sm font-medium">{t.totalMarketingCost}</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {marketingData.reduce((s, r) => s + r.totalMarketingCost, 0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-marketing-sources">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-sm font-medium">{t.leadsBySource}</CardTitle>
                      <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{marketingData.length}</div>
                      <p className="text-xs text-muted-foreground">{t.allChannels}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card data-testid="chart-marketing-leads-by-source">
                    <CardHeader>
                      <CardTitle className="text-base">{t.leadCountBySource}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marketingData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="leadCount" fill="#6366f1" radius={[4, 4, 0, 0]} name={t.totalLeads} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="chart-marketing-conversion-by-source">
                    <CardHeader>
                      <CardTitle className="text-base">{t.conversionBySource}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={marketingData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} unit="%" />
                            <Tooltip formatter={(v) => [`${v}%`, t.conversionRate]} />
                            <Bar dataKey="conversionRate" fill="#22c55e" radius={[4, 4, 0, 0]} name={t.conversionRate} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="card-top-sources">
                  <CardHeader>
                    <CardTitle className="text-base">{t.topPerformingSources}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[...marketingData]
                        .sort((a, b) => b.totalRevenue - a.totalRevenue || b.convertedCount - a.convertedCount)
                        .slice(0, 6)
                        .map((row, idx) => (
                          <div
                            key={row.source}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                            data-testid={`card-source-${row.source}`}
                          >
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            >
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{row.source}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.convertedCount} {t.converted} · {row.conversionRate}%
                                {row.totalRevenue > 0 && ` · ${row.totalRevenue.toLocaleString()}`}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="table-marketing-roi">
                  <CardHeader>
                    <CardTitle className="text-base">{t.roiBySource}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-start py-3 px-2 font-medium">{t.source}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.totalLeads}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.converted}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.conversionRate}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.totalMarketingCost}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.totalRevenue}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.avgDealValue}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.costPerLead}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.costPerConversion}</th>
                            <th className="text-center py-3 px-2 font-medium">{t.roi}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketingData.map((row, idx) => (
                            <tr key={idx} className="border-b last:border-0" data-testid={`row-marketing-${row.source}`}>
                              <td className="py-3 px-2 font-medium">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-3 w-3 rounded-full shrink-0"
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                  />
                                  {row.source}
                                </div>
                              </td>
                              <td className="text-center py-3 px-2">{row.leadCount}</td>
                              <td className="text-center py-3 px-2">{row.convertedCount}</td>
                              <td className="text-center py-3 px-2">
                                <Badge variant={row.conversionRate >= 20 ? "default" : "secondary"}>
                                  {row.conversionRate}%
                                </Badge>
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.totalMarketingCost > 0 ? row.totalMarketingCost.toLocaleString() : "—"}
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.totalRevenue > 0 ? row.totalRevenue.toLocaleString() : "—"}
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.avgDealValue !== null ? row.avgDealValue.toLocaleString() : "—"}
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.totalMarketingCost > 0 ? row.costPerLead.toLocaleString() : "—"}
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.costPerConversion !== null ? row.costPerConversion.toLocaleString() : "—"}
                              </td>
                              <td className="text-center py-3 px-2">
                                {row.roi !== null ? (
                                  <Badge variant={row.roi >= 0 ? "default" : "destructive"}>
                                    {row.roi}%
                                  </Badge>
                                ) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
