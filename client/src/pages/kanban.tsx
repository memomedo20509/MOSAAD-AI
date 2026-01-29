import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
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
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, DollarSign, User, Search, Loader2, Calendar, Building2 } from "lucide-react";
import type { Lead, LeadState, User as UserType } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { format } from "date-fns";

export default function KanbanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: states = [], isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const updateLeadMutation = useMutation({
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

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    updateLeadMutation.mutate({
      id: draggableId,
      stateId: destination.droppableId,
    });
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

  const getLeadsByState = (stateId: string) => {
    return filteredLeads.filter((lead) => lead.stateId === stateId);
  };

  const getAgentName = (userId: string | null) => {
    if (!userId) return "-";
    const agent = users.find((u) => u.id === userId);
    return agent ? `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.username : userId;
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-kanban-title">
            {t.kanbanBoard}
          </h1>
          <p className="text-muted-foreground">{t.kanbanSubtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
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
          <SelectTrigger className="w-[180px]" data-testid="filter-agent">
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
          <SelectTrigger className="w-[180px]" data-testid="filter-channel">
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className="flex-1 overflow-x-auto"
          style={{ direction: isRTL ? "rtl" : "ltr" }}
        >
          <div className="flex gap-4 h-full min-w-max pb-4">
            {sortedStates.map((state) => {
              const stateLeads = getLeadsByState(state.id);
              return (
                <div
                  key={state.id}
                  className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg"
                >
                  <div
                    className="p-3 rounded-t-lg flex items-center justify-between"
                    style={{ backgroundColor: state.color + "20" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: state.color }}
                      />
                      <h3 className="font-semibold">{state.name}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stateLeads.length}
                    </Badge>
                  </div>
                  <Droppable droppableId={state.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] transition-colors ${
                          snapshot.isDraggingOver ? "bg-muted/50" : ""
                        }`}
                      >
                        {stateLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`cursor-grab active:cursor-grabbing transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg rotate-2" : ""
                                }`}
                                data-testid={`card-lead-${lead.id}`}
                              >
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-sm line-clamp-1">
                                      {lead.name || t.noName}
                                    </h4>
                                    {lead.channel && (
                                      <Badge variant="outline" className="text-xs shrink-0">
                                        {lead.channel}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    {lead.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        <span dir="ltr">{lead.phone}</span>
                                      </div>
                                    )}
                                    {lead.budget && (
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        <span>{lead.budget}</span>
                                      </div>
                                    )}
                                    {lead.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="line-clamp-1">{lead.location}</span>
                                      </div>
                                    )}
                                    {lead.unitType && (
                                      <div className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        <span>{lead.unitType}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t text-xs">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="line-clamp-1">
                                        {getAgentName(lead.assignedTo)}
                                      </span>
                                    </div>
                                    {lead.createdAt && (
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                          {format(new Date(lead.createdAt), "MM/dd")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stateLeads.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">
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
    </div>
  );
}
