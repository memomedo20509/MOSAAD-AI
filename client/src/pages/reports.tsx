import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Users, TrendingUp, Target, BarChart3, PieChart, Calendar, Clock, AlertTriangle, Zap, Download, TrendingDown, FileText } from "lucide-react";
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

export default function ReportsPage() {
  const { t, isRTL, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<string>("month");
  const [marketingTimeRange, setMarketingTimeRange] = useState<string>("month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [pdfExporting, setPdfExporting] = useState(false);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" data-testid="tab-reports-overview">
            <BarChart3 className="h-4 w-4 mr-1" />
            {t.overview}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="marketing" data-testid="tab-reports-marketing">
              <TrendingUp className="h-4 w-4 mr-1" />
              {t.marketingTab}
            </TabsTrigger>
          )}
        </TabsList>

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
