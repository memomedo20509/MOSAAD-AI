import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArchiveRestore, Search, UserX } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import type { Lead, LeadState } from "@shared/schema";
import { format } from "date-fns";

export default function WithdrawnLeadsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: states = [], isLoading: statesLoading } = useQuery<LeadState[]>({ queryKey: ["/api/states"] });

  const lostStateIds = useMemo(() => {
    return new Set(states.filter((s) => s.category === "lost").map((s) => s.id));
  }, [states]);

  const lostStates = useMemo(() => {
    return states.filter((s) => s.category === "lost");
  }, [states]);

  const firstActiveStateId = useMemo(() => {
    const active = states.filter((s) => s.category === "active" || s.category === "untouched").sort((a, b) => a.order - b.order);
    return active[0]?.id;
  }, [states]);

  const withdrawnLeads = useMemo(() => {
    return leads.filter((l) => l.stateId && lostStateIds.has(l.stateId));
  }, [leads, lostStateIds]);

  const filtered = search
    ? withdrawnLeads.filter((l) =>
        (l.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (l.phone ?? "").includes(search)
      )
    : withdrawnLeads;

  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/leads/${id}`, { stateId: firstActiveStateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.restoreSuccess });
    },
    onError: () => toast({ title: t.restoreError, variant: "destructive" }),
  });

  const getStateName = (stateId: string | null) => {
    if (!stateId) return "—";
    return states.find((s) => s.id === stateId)?.name ?? "—";
  };

  const isLoading = leadsLoading || statesLoading;

  return (
    <div className="space-y-6" data-testid="page-withdrawn-leads" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isEcommerce ? t.navWithdrawnOrders : t.withdrawnLeadsTitle}</h1>
        <p className="text-muted-foreground">{isEcommerce ? t.withdrawnLeadsSubtitle : t.withdrawnLeadsSubtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchWithdrawn}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-withdrawn"
          />
        </div>
        <span className="text-sm text-muted-foreground ms-auto">{filtered.length} {t.withdrawnCount}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <UserX className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{t.noWithdrawnLeads}</p>
              <p className="text-sm text-muted-foreground">
                {lostStates.length === 0
                  ? t.noLostStates
                  : t.noWithdrawnLeadsNow}
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
                    <th className="text-start py-3 px-4 font-medium">{t.name}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.phone}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.status}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.channel}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.date}</th>
                    <th className="text-end py-3 px-4 font-medium">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/50" data-testid={`row-withdrawn-${lead.id}`}>
                      <td className="py-3 px-4 font-medium">{lead.name ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground" dir="ltr">{lead.phone ?? "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="destructive" className="text-xs">{getStateName(lead.stateId)}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{lead.channel ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {lead.createdAt ? format(new Date(lead.createdAt), "yyyy-MM-dd") : "—"}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreMutation.mutate(lead.id)}
                          disabled={restoreMutation.isPending || !firstActiveStateId}
                          data-testid={`button-restore-${lead.id}`}
                        >
                          <ArchiveRestore className="h-4 w-4 me-1" />
                          {t.restoreLead}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
