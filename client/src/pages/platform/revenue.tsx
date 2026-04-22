import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Package, CalendarClock } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { useLanguage } from "@/lib/i18n";

interface RevenueData {
  mrr: number;
  arr: number;
  mrrHistory: { month: string; mrr: number }[];
  breakdown: { name: string; count: number; revenue: number }[];
  renewalsNext30Days: number;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function PlatformRevenuePage() {
  const { t, isRTL } = useLanguage();
  const { data: revenue, isLoading } = useQuery<RevenueData>({
    queryKey: ["/api/platform/revenue"],
  });

  const formatCurrency = (n: number) => `${n.toLocaleString(isRTL ? "ar-EG" : "en-US")} ${t.platformCurrencySuffix}`;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold">{t.revenueTitle}</h1>
        <p className="text-muted-foreground">{t.revenueDesc}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-primary-foreground/70">MRR</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary-foreground/50" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32 bg-primary-foreground/20" /> : (
              <p className="text-2xl font-bold" data-testid="stat-mrr">{formatCurrency(revenue?.mrr ?? 0)}</p>
            )}
            <p className="text-xs text-primary-foreground/60 mt-1">{t.revenueMrrDesc}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">ARR</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : (
              <p className="text-2xl font-bold" data-testid="stat-arr">{formatCurrency(revenue?.arr ?? 0)}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t.revenueArrDesc}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">{t.revenueRenewals}</CardTitle>
            <CalendarClock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <p className="text-2xl font-bold" data-testid="stat-renewals">{revenue?.renewalsNext30Days ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t.revenueRenewalsDesc}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.revenueMrrHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue?.mrrHistory ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), "MRR"]} />
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t.revenueBreakdown}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48 w-full" /> : revenue?.breakdown && revenue.breakdown.length > 0 ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenue.breakdown}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), t.revenueRevLabel]} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenue.breakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {revenue.breakdown.map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium">{b.name}</span>
                      <span className="text-sm text-muted-foreground">({b.count} {t.revenueCompaniesSuffix})</span>
                    </div>
                    <span className="font-bold">{formatCurrency(b.revenue)}{t.revenuePerMonth}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t.revenueNoData}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
