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
} from "lucide-react";
import { Link } from "wouter";
import type { Lead, LeadState } from "@shared/schema";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { FilterPanel } from "@/components/filter-panel";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<string>("all");
  const [orderBy, setOrderBy] = useState<"recent" | "oldest">("recent");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: states, isLoading: statesLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update lead", variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete lead", variant: "destructive" });
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

  const handleExport = () => {
    if (!filteredLeads) return;
    const headers = ["Name", "Phone", "Email", "State", "Channel", "Created At"];
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
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Leads exported successfully" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-leads-title">All Leads</h1>
          <p className="text-muted-foreground">
            Manage and track your sales leads
          </p>
        </div>
        <Link href="/leads/new">
          <Button data-testid="button-add-lead">Add New Lead</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={selectedStateId} onValueChange={setSelectedStateId}>
            <SelectTrigger className="w-[180px]" data-testid="select-state-filter">
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
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
                Bulk Actions
                <ChevronDown className="ml-2 h-4 w-4" />
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
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={orderBy} onValueChange={(v) => setOrderBy(v as "recent" | "oldest")}>
            <SelectTrigger className="w-[160px]" data-testid="select-order">
              <SelectValue placeholder="Order by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
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
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="truncate">{lead.phone}</span>
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
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLeadMutation.mutate(lead.id);
                        }}
                        className="text-destructive"
                      >
                        Delete
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
    </div>
  );
}
