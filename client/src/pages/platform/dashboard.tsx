import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Ticket, AlertCircle, Calendar, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/lib/i18n";

interface PlatformStats {
  totalActiveCompanies: number;
  totalTrialCompanies: number;
  totalSuspendedCompanies: number;
  newRegistrationsThisMonth: number;
  openTickets: number;
  renewalsNext30Days: number;
}

interface RevenueData {
  mrr: number;
  arr: number;
  mrrHistory: { month: string; mrr: number }[];
  breakdown: { name: string; count: number; revenue: number }[];
}

function StatCard({ title, value, icon: Icon, description, color = "text-primary" }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function PlatformDashboard() {
  const { t, isRTL } = useLanguage();
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery<RevenueData>({
    queryKey: ["/api/platform/revenue"],
  });

  const formatCurrency = (n: number) => `${n.toLocaleString(isRTL ? "ar-EG" : "en-US")} ${t.platformCurrencySuffix}`;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold">{t.platformDashTitle}</h1>
        <p className="text-muted-foreground">{t.platformDashDesc}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              title={t.platformDashActiveCompanies}
              value={stats?.totalActiveCompanies ?? 0}
              icon={Building2}
              color="text-green-500"
              description={t.platformDashActiveDesc}
            />
            <StatCard
              title={t.platformDashTrial}
              value={stats?.totalTrialCompanies ?? 0}
              icon={Users}
              color="text-blue-500"
              description={t.platformDashTrialDesc}
            />
            <StatCard
              title={t.platformDashSuspended}
              value={stats?.totalSuspendedCompanies ?? 0}
              icon={AlertCircle}
              color="text-red-500"
              description={t.platformDashSuspendedDesc}
            />
            <StatCard
              title="MRR"
              value={formatCurrency(revenue?.mrr ?? 0)}
              icon={TrendingUp}
              color="text-emerald-500"
              description={t.platformDashMrrDesc}
            />
            <StatCard
              title={t.platformDashNewReg}
              value={stats?.newRegistrationsThisMonth ?? 0}
              icon={Calendar}
              color="text-purple-500"
              description={t.platformDashNewRegDesc}
            />
            <StatCard
              title={t.platformDashOpenTickets}
              value={stats?.openTickets ?? 0}
              icon={Ticket}
              color="text-orange-500"
              description={t.platformDashOpenTicketsDesc}
            />
          </>
        )}
      </div>

      {!revenueLoading && revenue && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70 text-sm">{t.platformDashArrLabel}</p>
                <p className="text-3xl font-bold mt-1" data-testid="stat-arr">{formatCurrency(revenue.arr)}</p>
              </div>
              <BarChart3 className="h-12 w-12 text-primary-foreground/30" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.platformDashMrrHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenue?.mrrHistory ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "MRR"]} />
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {!revenueLoading && revenue?.breakdown && revenue.breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.platformDashRevBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {revenue.breakdown.map((b) => (
                <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{b.name}</span>
                    <span className="text-sm text-muted-foreground ms-2">({b.count} {t.platformDashCompaniesSuffix})</span>
                  </div>
                  <span className="font-bold text-emerald-600">{formatCurrency(b.revenue)}{t.platformDashMonthly}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
