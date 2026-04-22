import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, Calendar, TrendingUp, DollarSign, ArrowLeft, ArrowRight } from "lucide-react";
import { PLATFORM_LEAD_STAGE_LABELS } from "@shared/schema";
import type { PlatformLead } from "@shared/schema";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useLanguage } from "@/lib/i18n";

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  demo_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  demo_done: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  proposal_sent: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  negotiation: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function KPICard({ title, value, icon: Icon, isLoading, sub, color }: {
  title: string;
  value: string | number;
  icon: typeof Users;
  isLoading?: boolean;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold" data-testid="text-platform-kpi-value">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlatformDashboardPage() {
  const { t, isRTL } = useLanguage();
  const dateLocale = isRTL ? ar : enUS;
  const NavIcon = isRTL ? ArrowLeft : ArrowRight;
  const { data: kpis, isLoading: kpisLoading } = useQuery<{
    leadsThisMonth: number;
    demosScheduled: number;
    conversionRate: number;
    pipelineValue: number;
  }>({ queryKey: ["/api/platform/leads/kpis"] });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<PlatformLead[]>({ queryKey: ["/api/platform/leads"] });

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);

  const upcomingActions = leads
    .filter(l => l.nextActionDate && new Date(l.nextActionDate) >= new Date() && !["won", "lost"].includes(l.stage))
    .sort((a, b) => new Date(a.nextActionDate!).getTime() - new Date(b.nextActionDate!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6" data-testid="page-platform-dashboard" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.platformSalesDashTitle}</h1>
        <p className="text-muted-foreground">{t.platformSalesDashDesc}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={t.platformSalesLeadsMonth}
          value={kpis?.leadsThisMonth ?? 0}
          icon={Users}
          isLoading={kpisLoading}
          sub={t.platformSalesLeadsMonthSub}
          color="text-blue-500"
        />
        <KPICard
          title={t.platformSalesDemos}
          value={kpis?.demosScheduled ?? 0}
          icon={Calendar}
          isLoading={kpisLoading}
          sub={t.platformSalesDemosSub}
          color="text-amber-500"
        />
        <KPICard
          title={t.platformSalesCloseRate}
          value={kpis ? `${kpis.conversionRate}%` : "—"}
          icon={TrendingUp}
          isLoading={kpisLoading}
          sub={t.platformSalesCloseRateSub}
          color="text-green-500"
        />
        <KPICard
          title="Pipeline Value"
          value={kpis ? `$${kpis.pipelineValue.toLocaleString()}` : "—"}
          icon={DollarSign}
          isLoading={kpisLoading}
          sub={t.platformSalesPipelineSub}
          color="text-indigo-500"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.platformSalesRecentLeads}</CardTitle>
            <Link href="/platform/leads" className="text-xs text-primary flex items-center gap-1 hover:underline" data-testid="link-all-platform-leads">
              {t.platformSalesViewAll}
              <NavIcon className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.platformSalesNoLeads}</p>
            ) : (
              <div className="space-y-3">
                {recentLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between gap-2" data-testid={`recent-lead-${lead.id}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lead.companyName}</p>
                      {lead.createdAt && (
                        <p className="text-xs text-muted-foreground">{format(new Date(lead.createdAt), "dd MMM", { locale: dateLocale })}</p>
                      )}
                    </div>
                    <Badge className={`flex-shrink-0 text-xs ${STAGE_COLORS[lead.stage] ?? ""}`}>
                      {PLATFORM_LEAD_STAGE_LABELS[lead.stage as keyof typeof PLATFORM_LEAD_STAGE_LABELS] ?? lead.stage}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.platformSalesUpcoming}</CardTitle>
            <Link href="/platform/leads/pipeline" className="text-xs text-primary flex items-center gap-1 hover:underline" data-testid="link-platform-pipeline">
              Pipeline
              <NavIcon className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : upcomingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.platformSalesNoActions}</p>
            ) : (
              <div className="space-y-3">
                {upcomingActions.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between gap-2" data-testid={`upcoming-action-${lead.id}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lead.companyName}</p>
                      {lead.nextActionDate && (
                        <p className="text-xs text-muted-foreground">{format(new Date(lead.nextActionDate), "dd MMM yyyy", { locale: dateLocale })}</p>
                      )}
                    </div>
                    {lead.dealValue && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">${Number(lead.dealValue).toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
