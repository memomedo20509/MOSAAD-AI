import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, GripVertical, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PlatformLead } from "@shared/schema";
import { PLATFORM_LEAD_STAGES, PLATFORM_LEAD_STAGE_LABELS, PLATFORM_LEAD_SOURCES } from "@shared/schema";

const STAGE_COLORS: Record<string, string> = {
  new_lead: "#6366f1",
  contacted: "#8b5cf6",
  demo_scheduled: "#f59e0b",
  demo_done: "#f97316",
  proposal_sent: "#3b82f6",
  negotiation: "#06b6d4",
  won: "#10b981",
  lost: "#ef4444",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "الموقع",
  referral: "إحالة",
  social: "سوشيال",
  cold_outreach: "تواصل بارد",
};

function PlatformLeadCard({ lead, onDragStart }: { lead: PlatformLead; onDragStart: (e: React.DragEvent, leadId: string) => void }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      data-testid={`card-platform-lead-${lead.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-medium text-sm truncate">{lead.companyName}</span>
        </div>
      </div>
      {lead.contactName && (
        <p className="text-xs text-muted-foreground mb-1 truncate">{lead.contactName}</p>
      )}
      {lead.dealValue && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>${Number(lead.dealValue).toLocaleString()}</span>
        </div>
      )}
      {lead.source && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1.5">
          {SOURCE_LABELS[lead.source] ?? lead.source}
        </Badge>
      )}
    </div>
  );
}

export default function PlatformLeadPipelinePage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<PlatformLead[]>({ queryKey: ["/api/platform/leads"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiRequest("PATCH", `/api/platform/leads/${id}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/leads"] });
    },
    onError: () => toast({ title: "فشل في تحديث المرحلة", variant: "destructive" }),
  });

  const filteredLeads = leads.filter(l => {
    if (filterSource !== "all" && l.source !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.companyName ?? "").toLowerCase().includes(q) || (l.contactName ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const leadsByStage = PLATFORM_LEAD_STAGES.reduce<Record<string, PlatformLead[]>>((acc, stage) => {
    acc[stage] = filteredLeads.filter(l => l.stage === stage);
    return acc;
  }, {});

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.stage !== targetStage) {
      updateMutation.mutate({ id: leadId, stage: targetStage });
    }
  }, [leads, updateMutation]);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(stage);
  }, []);

  const totalPipelineValue = filteredLeads
    .filter(l => !["won", "lost"].includes(l.stage))
    .reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);

  return (
    <div className="space-y-4" data-testid="page-platform-pipeline">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline المبيعات</h1>
        <p className="text-muted-foreground">تتبع ليدز المنصة بالسحب والإفلات</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="بحث بالشركة أو الاسم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-platform-pipeline"
        />
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40" data-testid="select-filter-pipeline-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المصادر</SelectItem>
            {PLATFORM_LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        {totalPipelineValue > 0 && (
          <span className="text-sm text-muted-foreground mr-auto">
            Pipeline: <strong>${totalPipelineValue.toLocaleString()}</strong>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-64">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
          {PLATFORM_LEAD_STAGES.map(stage => {
            const stageLeads = leadsByStage[stage] ?? [];
            const isDragOver = dragOverColumn === stage;
            const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                    <span className="font-medium text-xs truncate">{PLATFORM_LEAD_STAGE_LABELS[stage]}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{stageLeads.length}</Badge>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-muted-foreground px-1 mb-2">${stageValue.toLocaleString()}</p>
                )}
                <div
                  className={`space-y-2 rounded-lg p-2 min-h-[200px] transition-colors ${isDragOver ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/30"}`}
                  onDrop={e => handleDrop(e, stage)}
                  onDragOver={e => handleDragOver(e, stage)}
                  onDragLeave={() => setDragOverColumn(null)}
                  data-testid={`column-platform-stage-${stage}`}
                >
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">لا يوجد ليدز</p>
                  ) : (
                    stageLeads.map(lead => (
                      <PlatformLeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leads.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            لا يوجد ليدز. أضف ليدك الأول من صفحة قائمة الليدز.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
