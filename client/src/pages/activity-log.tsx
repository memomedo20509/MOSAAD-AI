import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import type { LeadHistory } from "@shared/schema";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  state_change: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  assignment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  reassignment: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  call: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  whatsapp: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  note: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

export default function ActivityLogPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const dateLocale = isRTL ? ar : enUS;
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const ACTION_LABELS: Record<string, string> = {
    created: t.activityLogActionCreated,
    state_change: t.activityLogActionStateChange,
    assignment: t.activityLogActionAssignment,
    reassignment: t.activityLogActionReassignment,
    call: t.activityLogActionCall,
    whatsapp: t.activityLogActionWhatsapp,
    note: t.activityLogActionNote,
    other: t.activityLogActionOther,
  };

  const { data: history = [], isLoading } = useQuery<LeadHistory[]>({
    queryKey: ["/api/history"],
  });

  const sorted = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
  }, [history]);

  const uniqueUsers = useMemo(() => {
    const users = new Set<string>();
    history.forEach((h) => { if (h.performedBy) users.add(h.performedBy); });
    return Array.from(users);
  }, [history]);

  const filtered = sorted.filter((h) => {
    if (filterAction !== "all" && h.type !== filterAction && h.action !== filterAction) return false;
    if (filterUser !== "all" && h.performedBy !== filterUser) return false;
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (h.createdAt && new Date(h.createdAt) < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (h.createdAt && new Date(h.createdAt) > toDate) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        (h.action ?? "").toLowerCase().includes(q) ||
        (h.description ?? "").toLowerCase().includes(q) ||
        (h.performedBy ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasFilters = filterAction !== "all" || filterUser !== "all" || search || dateFrom || dateTo;

  return (
    <div className="space-y-6" data-testid="page-activity-log" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.actionsLogTitle}</h1>
        <p className="text-muted-foreground">{isEcommerce ? t.actionsLogSubtitleOrders : t.actionsLogSubtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchLog}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-log"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-40" data-testid="select-filter-action">
            <SelectValue placeholder={t.filterByAction} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allActions}</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-40" data-testid="select-filter-user">
            <SelectValue placeholder={t.filterByUser} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allUsers}</SelectItem>
            {uniqueUsers.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          placeholder={t.dateFromLabel}
          data-testid="input-date-from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          placeholder={t.dateToLabel}
          data-testid="input-date-to"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setFilterAction("all"); setFilterUser("all"); setDateFrom(""); setDateTo(""); }}
            data-testid="button-clear-filters"
          >
            {t.clearAllFilters}
          </Button>
        )}
        <span className="text-sm text-muted-foreground ms-auto" data-testid="text-results-count">{filtered.length} {t.activityCount}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <History className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{t.noActivityFound}</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? t.noResultsWithFilters : t.noActivityYet}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-3 px-4 font-medium">{t.action}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.details}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.by}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50" data-testid={`row-history-${entry.id}`}>
                      <td className="py-3 px-4">
                        <Badge className={ACTION_COLORS[entry.type ?? "other"] ?? ACTION_COLORS.other} data-testid={`badge-action-${entry.id}`}>
                          {ACTION_LABELS[entry.type ?? "other"] ?? entry.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate" data-testid={`text-description-${entry.id}`}>
                        {entry.description ?? entry.action}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground" data-testid={`text-performed-by-${entry.id}`}>{entry.performedBy ?? t.system}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap" data-testid={`text-date-${entry.id}`}>
                        {entry.createdAt ? format(new Date(entry.createdAt), "d MMM yyyy - hh:mm a", { locale: dateLocale }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 200 && (
              <div className="text-center py-3 text-sm text-muted-foreground border-t" data-testid="text-pagination-info">
                {t.showingFirst} 200 {t.outOf} {filtered.length}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
