import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, User, GripVertical } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import type { Lead, LeadState } from "@shared/schema";

const SCORE_COLORS: Record<string, string> = {
  hot: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  warm: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  cold: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function LeadCard({ lead, onDragStart, noName }: { lead: Lead; onDragStart: (e: React.DragEvent, leadId: string) => void; noName: string }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      data-testid={`card-lead-${lead.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm truncate">{lead.name || noName}</span>
        </div>
        {lead.score && (
          <Badge className={`text-[10px] px-1.5 py-0 ${SCORE_COLORS[lead.score] ?? ""}`} data-testid={`badge-score-${lead.id}`}>
            {lead.score}
          </Badge>
        )}
      </div>
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Phone className="h-3 w-3" />
          <span dir="ltr">{lead.phone}</span>
        </div>
      )}
      {lead.channel && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="capitalize">{lead.channel}</span>
        </div>
      )}
    </div>
  );
}

export default function LeadPipelinePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const { data: states = [], isLoading: statesLoading } = useQuery<LeadState[]>({ queryKey: ["/api/states"] });
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, stateId }: { id: string; stateId: string }) =>
      apiRequest("PATCH", `/api/leads/${id}`, { stateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => toast({ title: t.pipelineUpdateError, variant: "destructive" }),
  });

  const sortedStates = [...states].sort((a, b) => a.order - b.order);

  const filteredLeads = leads.filter((l) => {
    if (filterChannel !== "all" && l.channel !== filterChannel) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.name ?? "").toLowerCase().includes(q) || (l.phone ?? "").includes(q);
    }
    return true;
  });

  const leadsByState = sortedStates.reduce<Record<string, Lead[]>>((acc, state) => {
    acc[state.id] = filteredLeads.filter((l) => l.stateId === state.id);
    return acc;
  }, {});

  const unassignedLeads = filteredLeads.filter((l) => !l.stateId || !states.find((s) => s.id === l.stateId));

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStateId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.stateId !== targetStateId) {
      updateMutation.mutate({ id: leadId, stateId: targetStateId });
    }
  }, [leads, updateMutation]);

  const handleDragOver = useCallback((e: React.DragEvent, stateId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(stateId);
  }, []);

  const isLoading = statesLoading || leadsLoading;

  return (
    <div className="space-y-4" data-testid="page-lead-pipeline" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isEcommerce ? t.pipelineTitleOrders : t.pipelineTitle}</h1>
        <p className="text-muted-foreground">{isEcommerce ? t.pipelineSubtitleOrders : t.pipelineSubtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={t.searchByNameOrPhone}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-pipeline"
        />
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-40" data-testid="select-filter-channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allSources}</SelectItem>
            <SelectItem value="facebook">{t.sourceFacebook}</SelectItem>
            <SelectItem value="whatsapp">{t.sourceWhatsapp}</SelectItem>
            <SelectItem value="instagram">{t.sourceInstagram}</SelectItem>
            <SelectItem value="website">{t.sourceWebsite}</SelectItem>
            <SelectItem value="referral">{t.channelReferral}</SelectItem>
            <SelectItem value="other">{t.other}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ms-auto">{filteredLeads.length} {isEcommerce ? t.orderCount : t.leadCount}</span>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-72">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : sortedStates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {t.noStates}
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
          {unassignedLeads.length > 0 && (
            <div className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="font-medium text-sm">{t.noState}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{unassignedLeads.length}</Badge>
              </div>
              <div className="space-y-2 bg-muted/30 rounded-lg p-2 min-h-[200px]">
                {unassignedLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} noName={t.noName} />
                ))}
              </div>
            </div>
          )}

          {sortedStates.map((state) => {
            const stateLeads = leadsByState[state.id] ?? [];
            const isDragOver = dragOverColumn === state.id;
            return (
              <div key={state.id} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: state.color }} />
                    <span className="font-medium text-sm">{state.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{stateLeads.length}</Badge>
                </div>
                <div
                  className={`space-y-2 rounded-lg p-2 min-h-[200px] transition-colors ${isDragOver ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/30"}`}
                  onDrop={(e) => handleDrop(e, state.id)}
                  onDragOver={(e) => handleDragOver(e, state.id)}
                  onDragLeave={() => setDragOverColumn(null)}
                  data-testid={`column-state-${state.id}`}
                >
                  {stateLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">{isEcommerce ? t.noOrdersInState : t.noLeadsInState}</p>
                  ) : (
                    stateLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} noName={t.noName} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
