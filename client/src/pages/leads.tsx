import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Users, Pencil, Download, X } from "lucide-react";
import { SiFacebook, SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "lost"] as const;
type LeadStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  qualified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  messenger: <SiFacebook className="h-4 w-4 text-[#1877F2]" />,
  whatsapp: <SiWhatsapp className="h-4 w-4 text-[#25D366]" />,
};

function LeadForm({ initial, onSave, onCancel, isPending }: {
  initial?: Partial<Lead>;
  onSave: (data: Partial<Lead>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    interest: initial?.interest ?? "",
    sourceChannel: initial?.sourceChannel ?? "",
    status: initial?.status ?? "new",
    notes: initial?.notes ?? "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input data-testid="input-lead-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contact name" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input data-testid="input-lead-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input data-testid="input-lead-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Interest</Label>
          <Input data-testid="input-lead-interest" value={form.interest} onChange={e => setForm(f => ({ ...f, interest: e.target.value }))} placeholder="What are they interested in?" />
        </div>
        <div>
          <Label>Source Channel</Label>
          <Select value={form.sourceChannel || "other"} onValueChange={v => setForm(f => ({ ...f, sourceChannel: v }))}>
            <SelectTrigger data-testid="select-lead-channel"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="messenger">Messenger</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="web">Website</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger data-testid="select-lead-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea data-testid="input-lead-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." rows={3} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={isPending} data-testid="button-save-lead">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function exportCSV(leads: Lead[]) {
  const headers = ["Name", "Phone", "Email", "Interest", "Source", "Status", "Created"];
  const rows = leads.map(l => [
    l.name ?? "",
    l.phone ?? "",
    l.email ?? "",
    l.interest ?? "",
    l.sourceChannel ?? "",
    l.status,
    l.createdAt ? format(new Date(l.createdAt), "yyyy-MM-dd") : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setDialogOpen(false);
      toast({ title: "Lead created" });
    },
    onError: () => toast({ title: "Failed to create lead", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => apiRequest("PATCH", `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setEditLead(null);
      if (drawerLead) {
        const updated = leads.find(l => l.id === drawerLead.id);
        if (updated) setDrawerLead(updated);
      }
      toast({ title: "Lead updated" });
    },
    onError: () => toast({ title: "Failed to update lead", variant: "destructive" }),
  });

  const filtered = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterSource !== "all" && l.sourceChannel !== filterSource) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return (l.name ?? "").toLowerCase().includes(q)
        || (l.phone ?? "").includes(q)
        || (l.email ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const hasFilters = filterStatus !== "all" || filterSource !== "all" || filterSearch;

  return (
    <div className="space-y-6" data-testid="page-leads">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isEcommerce ? "جميع الطلبات" : "جميع الليدز"}</h1>
          <p className="text-muted-foreground">{isEcommerce ? "الطلبات المستلمة من الشات بوت" : "الليدز المستلمة من الشات بوت"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportCSV(filtered)} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, phone, email..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-leads"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40" data-testid="select-filter-source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="messenger">Messenger</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="web">Website</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterStatus("all"); setFilterSource("all"); setFilterSearch(""); }}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} leads</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No leads yet</p>
              <p className="text-sm text-muted-foreground">Leads captured by your chatbot will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">No leads match your filters</p>
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterSource("all"); setFilterSearch(""); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-3 px-4 font-medium">Name</th>
                    <th className="text-start py-3 px-4 font-medium">Phone</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">Email</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">Interest</th>
                    <th className="text-start py-3 px-4 font-medium">Source</th>
                    <th className="text-start py-3 px-4 font-medium">Status</th>
                    <th className="text-start py-3 px-4 font-medium hidden lg:table-cell">Date</th>
                    <th className="text-end py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr
                      key={lead.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setDrawerLead(lead)}
                      data-testid={`row-lead-${lead.id}`}
                    >
                      <td className="py-3 px-4 font-medium">{lead.name ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{lead.phone ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{lead.email ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{lead.interest ?? "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {CHANNEL_ICON[lead.sourceChannel ?? ""] ?? null}
                          <span className="text-muted-foreground capitalize">{lead.sourceChannel ?? "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={STATUS_COLORS[lead.status] ?? ""}>{lead.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4 text-end" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => setEditLead(lead)} data-testid={`button-edit-lead-${lead.id}`}>
                          <Pencil className="h-4 w-4" />
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

      <Sheet open={!!drawerLead} onOpenChange={open => !open && setDrawerLead(null)}>
        <SheetContent className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Lead Details</SheetTitle>
          </SheetHeader>
          {drawerLead && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-3">
                {[
                  { label: "Name", value: drawerLead.name },
                  { label: "Phone", value: drawerLead.phone },
                  { label: "Email", value: drawerLead.email },
                  { label: "Interest", value: drawerLead.interest },
                  { label: "Source", value: drawerLead.sourceChannel },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2 border-b pb-2">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="text-end">{value ?? "—"}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-b pb-2">
                  <span className="text-muted-foreground font-medium">Status</span>
                  <Badge className={STATUS_COLORS[drawerLead.status] ?? ""}>{drawerLead.status}</Badge>
                </div>
                <div className="flex justify-between gap-2 border-b pb-2">
                  <span className="text-muted-foreground font-medium">Created</span>
                  <span>{drawerLead.createdAt ? format(new Date(drawerLead.createdAt), "MMM d, yyyy") : "—"}</span>
                </div>
                {drawerLead.notes && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Notes</p>
                    <p className="text-sm bg-muted rounded-md p-2">{drawerLead.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <p className="font-medium mb-2">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={drawerLead.status === s ? "default" : "outline"}
                      className="capitalize justify-start"
                      onClick={() => {
                        updateMutation.mutate({ id: drawerLead.id, data: { status: s } });
                        setDrawerLead({ ...drawerLead, status: s });
                      }}
                      data-testid={`button-drawer-status-${s}`}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => { setEditLead(drawerLead); setDrawerLead(null); }}
                data-testid="button-drawer-edit"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Lead
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <LeadForm onSave={data => createMutation.mutate(data)} onCancel={() => setDialogOpen(false)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLead} onOpenChange={open => !open && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editLead && <LeadForm initial={editLead} onSave={data => updateMutation.mutate({ id: editLead.id, data })} onCancel={() => setEditLead(null)} isPending={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
