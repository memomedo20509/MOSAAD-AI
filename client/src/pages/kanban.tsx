import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  MapPin,
  DollarSign,
  User,
  Search,
  Loader2,
  Calendar,
  Building2,
  Flame,
  Thermometer,
  Snowflake,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";
import type { Lead, LeadState, User as UserType } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { computeLeadScore, SCORE_COLORS } from "@/lib/scoring";
import { LeadDetailPanel } from "@/components/lead-detail-panel";

export default function KanbanPage() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: states = [], isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stateId }: { id: string; stateId: string }) =>
      apiRequest("PATCH", `/api/leads/${id}`, { stateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.leadUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.leadUpdatedError, variant: "destructive" });
    },
  });

  const panelUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: (updatedLead: Lead, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", variables.id, "history"] });
      setSelectedLead((prev) => (prev?.id === variables.id ? updatedLead : prev));
      toast({ title: t.leadUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.leadUpdatedError, variant: "destructive" });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    moveStageMutation.mutate({ id: draggableId, stateId: destination.droppableId });
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAgent = filterAgent === "all" || lead.assignedTo === filterAgent;
    const matchesChannel = filterChannel === "all" || lead.channel === filterChannel;
    return matchesSearch && matchesAgent && matchesChannel;
  });

  const getLeadsByState = (stateId: string) =>
    filteredLeads.filter((lead) => lead.stateId === stateId);

  const getAgentName = (userId: string | null) => {
    if (!userId) return "-";
    const agent = users.find((u) => u.id === userId);
    return agent ? `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username : userId;
  };

  const getColumnTotalBudget = (stateLeads: Lead[]) => {
    const total = stateLeads.reduce((sum, lead) => {
      const b = parseFloat(String(lead.budget || "0").replace(/[^0-9.]/g, ""));
      return sum + (isNaN(b) ? 0 : b);
    }, 0);
    if (total === 0) return null;
    if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
    if (total >= 1_000) return `${(total / 1_000).toFixed(0)}K`;
    return String(total);
  };

  const getAgingInfo = (lead: Lead) => {
    const now = new Date();
    const created = lead.createdAt ? new Date(lead.createdAt) : null;
    if (!created) return null;
    const hoursOld = differenceInHours(now, created);
    const daysOld = differenceInDays(now, created);
    return { hoursOld, daysOld };
  };

  const channels = [...new Set(leads.map((l) => l.channel).filter(Boolean))];
  const sortedStates = [...states].sort((a, b) => a.order - b.order);

  if (leadsLoading || statesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-kanban-title">
          {t.kanbanBoard}
        </h1>
        <p className="text-muted-foreground text-sm">{t.kanbanSubtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchLeads}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
            data-testid="input-search-kanban"
          />
        </div>
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="w-[150px]" data-testid="filter-agent">
            <SelectValue placeholder={t.allAgents} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allAgents}</SelectItem>
            {users
              .filter((u) => u.role === "sales_agent" || u.role === "sales_manager")
              .map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.firstName || agent.username}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-[150px]" data-testid="filter-channel">
            <SelectValue placeholder={t.allChannels} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allChannels}</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel} value={channel!}>
                {channel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto" style={{ direction: isRTL ? "rtl" : "ltr" }}>
          <div className="flex gap-3 h-full min-w-max pb-4">
            {sortedStates.map((state) => {
              const stateLeads = getLeadsByState(state.id);
              const totalBudget = getColumnTotalBudget(stateLeads);

              return (
                <div key={state.id} className="w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-xl border border-border/50">
                  {/* Column Header */}
                  <div
                    className="px-3 py-2.5 rounded-t-xl flex items-center justify-between"
                    style={{ backgroundColor: state.color + "15" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: state.color }} />
                      <h3 className="font-semibold text-sm">{state.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalBudget && (
                        <span className="text-xs text-muted-foreground font-medium bg-background/60 px-1.5 py-0.5 rounded">
                          {totalBudget}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 min-w-[1.25rem] px-1.5 font-bold"
                        style={{ backgroundColor: state.color + "25", color: state.color }}
                      >
                        {stateLeads.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={state.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] transition-colors rounded-b-xl ${
                          snapshot.isDraggingOver ? "bg-primary/5" : ""
                        }`}
                      >
                        {stateLeads.map((lead, index) => {
                          const aging = getAgingInfo(lead);
                          const isNew = aging && aging.hoursOld < 24;
                          const isOld = aging && aging.daysOld >= 5;
                          const isVeryOld = aging && aging.daysOld >= 10;
                          const { score } = computeLeadScore(lead);

                          return (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`transition-all select-none border
                                    ${snapshot.isDragging
                                      ? "shadow-2xl rotate-1 opacity-95 scale-105 cursor-grabbing"
                                      : "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
                                    }
                                    ${isVeryOld ? "border-red-300 dark:border-red-800/70" : isOld ? "border-amber-300 dark:border-amber-800/70" : ""}
                                  `}
                                  onClick={() => {
                                    if (!snapshot.isDragging) setSelectedLead(lead);
                                  }}
                                  data-testid={`card-lead-${lead.id}`}
                                >
                                  <CardContent className="p-3 space-y-2">
                                    {/* Row 1: Name + badges */}
                                    <div className="flex items-start justify-between gap-1.5">
                                      <h4 className="font-semibold text-sm line-clamp-1 flex-1 leading-snug">
                                        {lead.name || t.noName}
                                      </h4>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {isNew && (
                                          <Badge className="text-xs gap-0.5 bg-yellow-400 hover:bg-yellow-400 text-yellow-900 border-yellow-400 px-1 h-4" data-testid={`badge-new-${lead.id}`}>
                                            <Zap className="h-2.5 w-2.5" />
                                          </Badge>
                                        )}
                                        <Badge className={`text-xs gap-0.5 border px-1.5 h-4 ${SCORE_COLORS[score]}`} data-testid={`badge-score-kanban-${lead.id}`}>
                                          {score === "hot" ? <Flame className="h-2.5 w-2.5" /> : score === "warm" ? <Thermometer className="h-2.5 w-2.5" /> : <Snowflake className="h-2.5 w-2.5" />}
                                          {score === "hot" ? t.scoreHot : score === "warm" ? t.scoreWarm : t.scoreCold}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Channel */}
                                    {lead.channel && (
                                      <Badge variant="outline" className="text-xs h-4 px-1.5 font-normal">
                                        {lead.channel}
                                      </Badge>
                                    )}

                                    {/* Lead details */}
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                      {lead.phone && (
                                        <div className="flex items-center gap-1.5">
                                          <Phone className="h-3 w-3 shrink-0" />
                                          <span dir="ltr">{lead.phone}</span>
                                        </div>
                                      )}
                                      {lead.budget && (
                                        <div className="flex items-center gap-1.5">
                                          <DollarSign className="h-3 w-3 shrink-0" />
                                          <span>{lead.budget}</span>
                                        </div>
                                      )}
                                      {lead.location && (
                                        <div className="flex items-center gap-1.5">
                                          <MapPin className="h-3 w-3 shrink-0" />
                                          <span className="line-clamp-1">{lead.location}</span>
                                        </div>
                                      )}
                                      {lead.unitType && (
                                        <div className="flex items-center gap-1.5">
                                          <Building2 className="h-3 w-3 shrink-0" />
                                          <span>{lead.unitType}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Footer: agent + aging + date */}
                                    <div className="flex items-center justify-between pt-1.5 border-t text-xs gap-2">
                                      <div className="flex items-center gap-1 text-muted-foreground min-w-0">
                                        <User className="h-3 w-3 shrink-0" />
                                        <span className="truncate max-w-[80px]">
                                          {getAgentName(lead.assignedTo)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {aging && (
                                          <div className={`flex items-center gap-0.5 font-medium ${isVeryOld ? "text-red-500" : isOld ? "text-amber-500" : "text-muted-foreground"}`}>
                                            {isOld ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                            <span>
                                              {aging.daysOld > 0 ? `${aging.daysOld}ي` : `${aging.hoursOld}س`}
                                            </span>
                                          </div>
                                        )}
                                        {lead.createdAt && (
                                          <div className="flex items-center gap-0.5 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{format(new Date(lead.createdAt), "MM/dd")}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {stateLeads.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm opacity-50">
                            {t.noLeadsInState}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Lead Detail Panel — نفس الـ animation بتاع صفحة الليدز */}
      <LeadDetailPanel
        lead={selectedLead}
        states={states}
        onClose={() => setSelectedLead(null)}
        onUpdate={(data) => {
          if (selectedLead) {
            panelUpdateMutation.mutate({ id: selectedLead.id, data });
          }
        }}
      />
    </div>
  );
}
