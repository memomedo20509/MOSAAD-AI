import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Phone,
  Mail,
  User,
  Calendar,
  ChevronDown,
  X,
  MessageCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { useEffect } from "react";
import type { Lead, LeadState } from "@shared/schema";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { LeadDetailsModal } from "@/components/lead-details-modal";
import { FilterPanel } from "@/components/filter-panel";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { format, differenceInHours } from "date-fns";
import { computeLeadScore, SCORE_COLORS } from "@/lib/scoring";
import { Flame, Thermometer, Snowflake, Settings } from "lucide-react";
import { ScoringSettingsDialog } from "@/components/scoring-settings-dialog";
import { useAuth } from "@/hooks/use-auth";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<string>("all");
  const [orderBy, setOrderBy] = useState<"recent" | "oldest">("recent");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsModalLeadId, setDetailsModalLeadId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [scoringSettingsOpen, setScoringSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const search = useSearch();

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const leadId = params.get("leadId");
    if (leadId && leads) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
      }
    }
  }, [search, leads]);

  const { data: states, isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.leadUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.leadUpdatedError, variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.leadDeletedSuccess });
    },
    onError: () => {
      toast({ title: t.leadDeletedError, variant: "destructive" });
    },
  });

  const isLoading = leadsLoading || statesLoading;

  const filteredLeads = leads
    ?.filter((lead) => {
      const matchesSearch =
        !searchQuery ||
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesState =
        selectedStateId === "all" || lead.stateId === selectedStateId;

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const leadValue = lead[key as keyof Lead];
        return leadValue?.toString().toLowerCase().includes(value.toLowerCase());
      });

      return matchesSearch && matchesState && matchesFilters;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return orderBy === "recent" ? dateB - dateA : dateA - dateB;
    });

  const toggleLead = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const toggleAll = () => {
    if (selectedLeads.size === filteredLeads?.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads?.map((l) => l.id)));
    }
  };

  const getStateBadge = (stateId: string | null) => {
    const state = states?.find((s) => s.id === stateId);
    if (!state) return null;
    return (
      <Badge
        variant="secondary"
        style={{
          backgroundColor: state.color + "20",
          color: state.color,
          borderColor: state.color + "40",
        }}
      >
        {state.name}
      </Badge>
    );
  };

  const getContactStatusBadge = (lead: Lead) => {
    if (lead.firstContactAt) return null;
    if (!lead.createdAt) return null;
    const hoursSinceCreation = differenceInHours(new Date(), new Date(lead.createdAt));
    if (hoursSinceCreation >= 24) {
      return (
        <Badge
          variant="destructive"
          className="text-xs gap-1 flex-shrink-0"
          data-testid={`badge-overdue-${lead.id}`}
        >
          <AlertTriangle className="h-3 w-3" />
          {t.overdueContact}
        </Badge>
      );
    }
    if (hoursSinceCreation >= 12) {
      return (
        <Badge
          variant="outline"
          className="text-xs gap-1 flex-shrink-0 border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
          data-testid={`badge-approaching-${lead.id}`}
        >
          <Clock className="h-3 w-3" />
          {t.approachingOverdue}
        </Badge>
      );
    }
    return null;
  };

  const handleExport = () => {
    if (!filteredLeads) return;
    const headers = [t.name, t.phone, t.email, t.leadStatus, t.channel, t.createdAt];
    const rows = filteredLeads.map((lead) => [
      lead.name || "",
      lead.phone || "",
      lead.email || "",
      states?.find((s) => s.id === lead.stateId)?.name || "",
      lead.channel || "",
      lead.createdAt ? format(new Date(lead.createdAt), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t.leads + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t.leadUpdatedSuccess });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-leads-title">{t.allLeads}</h1>
          <p className="text-muted-foreground">
            {t.manageLeadsSubtitle}
          </p>
        </div>
        <div className="flex gap-2">
          {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "sales_manager") && (
            <Button variant="outline" size="sm" onClick={() => setScoringSettingsOpen(true)} data-testid="button-scoring-settings">
              <Settings className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t.leadScore}
            </Button>
          )}
          <Link href="/leads/new">
            <Button data-testid="button-add-lead">{t.addNewLead}</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
            <Input
              placeholder={t.searchLeads}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rtl:pl-3 rtl:pr-9"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={selectedStateId} onValueChange={setSelectedStateId}>
            <SelectTrigger className="w-[180px]" data-testid="select-state-filter">
              <SelectValue placeholder={t.allStates} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStates}</SelectItem>
              {states?.map((state) => (
                <SelectItem key={state.id} value={state.id}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-bulk-actions">
                {t.actions}
                <ChevronDown className="ml-2 h-4 w-4 rtl:ml-0 rtl:mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  selectedLeads.forEach((id) => deleteLeadMutation.mutate(id));
                  setSelectedLeads(new Set());
                }}
                disabled={selectedLeads.size === 0}
              >
                {t.delete} {t.selected}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={orderBy} onValueChange={(v) => setOrderBy(v as "recent" | "oldest")}>
            <SelectTrigger className="w-[160px]" data-testid="select-order">
              <SelectValue placeholder={t.recent} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t.recent}</SelectItem>
              <SelectItem value="oldest">{t.oldest}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(true)}
            data-testid="button-filter"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {Object.keys(filters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(
            ([key, value]) =>
              value && (
                <Badge key={key} variant="secondary" className="gap-1">
                  {key}: {value}
                  <button
                    onClick={() => {
                      const newFilters = { ...filters };
                      delete newFilters[key];
                      setFilters(newFilters);
                    }}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={selectedLeads.size === filteredLeads?.length && filteredLeads?.length > 0}
          onCheckedChange={toggleAll}
          data-testid="checkbox-select-all"
        />
        <span data-testid="text-leads-count">{filteredLeads?.length || 0} leads</span>
        {selectedLeads.size > 0 && (
          <span className="text-primary">({selectedLeads.size} selected)</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLeads && filteredLeads.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => setSelectedLead(lead)}
              data-testid={`card-lead-${lead.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkbox-lead-${lead.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate" data-testid={`text-lead-name-${lead.id}`}>
                          {lead.name || "No Name"}
                        </h3>
                        {getStateBadge(lead.stateId)}
                        {(() => {
                          const { score } = computeLeadScore(lead);
                          const scoreLabel = score === "hot" ? t.scoreHot : score === "warm" ? t.scoreWarm : t.scoreCold;
                          const scoreIcon = score === "hot" ? <Flame className="h-2.5 w-2.5" /> : score === "warm" ? <Thermometer className="h-2.5 w-2.5" /> : <Snowflake className="h-2.5 w-2.5" />;
                          return (
                            <Badge className={`text-xs gap-0.5 border ${SCORE_COLORS[score]}`} data-testid={`badge-score-${lead.id}`}>
                              {scoreIcon}{scoreLabel}
                            </Badge>
                          );
                        })()}
                        {getContactStatusBadge(lead)}
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {lead.phone && (
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                data-testid={`button-whatsapp-${lead.id}`}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.assignedTo && (
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{lead.assignedTo}</span>
                          </div>
                        )}
                      </div>

                      {(lead.channel || lead.campaign) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lead.channel && (
                            <Badge variant="outline" className="text-xs">
                              {lead.channel}
                            </Badge>
                          )}
                          {lead.campaign && (
                            <Badge variant="outline" className="text-xs">
                              {lead.campaign}
                            </Badge>
                          )}
                        </div>
                      )}

                      {lead.lastAction && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{lead.lastAction}</span>
                          {lead.lastActionDate && (
                            <span>
                              - {format(new Date(lead.lastActionDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      )}
                      {lead.firstContactAt ? (
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-response-time-${lead.id}`}>
                          <Clock className="h-3 w-3 text-green-500" />
                          <span>{t.firstContactAt}: {format(new Date(lead.firstContactAt), "MMM d, HH:mm")}</span>
                          {lead.responseTimeMinutes !== null && lead.responseTimeMinutes !== undefined && (
                            <span className="font-medium text-green-600">
                              ({lead.responseTimeMinutes < 60
                                ? `${lead.responseTimeMinutes}${t.minutesAbbr}`
                                : `${Math.floor(lead.responseTimeMinutes / 60)}${t.hoursAbbr}${lead.responseTimeMinutes % 60 > 0 ? ` ${lead.responseTimeMinutes % 60}${t.minutesAbbr}` : ""}`
                              })
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                        data-testid={`menu-quick-view-${lead.id}`}
                      >
                        {t.viewDetails}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsModalLeadId(lead.id);
                        }}
                        data-testid={`menu-full-details-${lead.id}`}
                      >
                        {t.leadDetails}
                      </DropdownMenuItem>
                      {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "sales_manager") && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            apiRequest("POST", `/api/leads/${lead.id}/auto-assign`)
                              .then(() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/team-load"] });
                                toast({ title: t.autoAssignSuccess });
                              })
                              .catch(() => toast({ title: t.autoAssignError, variant: "destructive" }));
                          }}
                          data-testid={`menu-auto-assign-${lead.id}`}
                        >
                          {t.autoAssign}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLeadMutation.mutate(lead.id);
                        }}
                        className="text-destructive"
                        data-testid={`menu-delete-${lead.id}`}
                      >
                        {t.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No leads found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery || selectedStateId !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first lead"}
            </p>
            <Link href="/leads/new">
              <Button className="mt-4" data-testid="button-add-first-lead">Add New Lead</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <LeadDetailPanel
        lead={selectedLead}
        states={states || []}
        onClose={() => setSelectedLead(null)}
        onUpdate={(data) => {
          if (selectedLead) {
            updateLeadMutation.mutate({ id: selectedLead.id, data });
          }
        }}
      />

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      <LeadDetailsModal
        leadId={detailsModalLeadId}
        isOpen={!!detailsModalLeadId}
        onClose={() => setDetailsModalLeadId(null)}
      />

      <ScoringSettingsDialog
        open={scoringSettingsOpen}
        onClose={() => setScoringSettingsOpen(false)}
      />
    </div>
  );
}
