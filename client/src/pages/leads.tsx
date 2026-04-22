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
import { useLanguage } from "@/lib/i18n";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";

type LeadRecord = Lead & {
  status: string;
  sourceChannel: string | null;
  interest: string | null;
};

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
  initial?: Partial<LeadRecord>;
  onSave: (data: Partial<LeadRecord>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const statusLabels: Record<string, string> = {
    new: t.statusNew, contacted: t.statusContacted, qualified: t.statusQualified,
    converted: t.statusConverted, lost: t.statusLost,
  };
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    notes: initial?.notes ?? "",
    interest: initial?.interest ?? "",
    sourceChannel: initial?.sourceChannel ?? "",
    status: initial?.status ?? "new",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t.name}</Label>
          <Input data-testid="input-lead-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.contactNamePlaceholder} />
        </div>
        <div>
          <Label>{t.phone}</Label>
          <Input data-testid="input-lead-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
        </div>
      </div>
      <div>
        <Label>{t.email}</Label>
        <Input data-testid="input-lead-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
      </div>
      <div>
        <Label>{t.leadInterest}</Label>
        <Input data-testid="input-lead-interest" value={form.interest} onChange={e => setForm(f => ({ ...f, interest: e.target.value }))} placeholder={t.interestPlaceholder} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t.sourceChannel}</Label>
          <Select value={form.sourceChannel} onValueChange={v => setForm(f => ({ ...f, sourceChannel: v }))}>
            <SelectTrigger data-testid="select-lead-source">
              <SelectValue placeholder={t.sourceChannel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="messenger">{t.sourceMessenger}</SelectItem>
              <SelectItem value="whatsapp">{t.sourceWhatsapp}</SelectItem>
              <SelectItem value="web">{t.sourceWebsite}</SelectItem>
              <SelectItem value="other">{t.sourceOther}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t.status}</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger data-testid="select-lead-status">
              <SelectValue placeholder={t.status} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>{t.notes}</Label>
        <Textarea data-testid="input-lead-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t.additionalNotesPlaceholder} rows={3} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">{t.cancel}</Button>
        <Button onClick={() => onSave(form)} disabled={isPending} data-testid="button-save-lead">
          {isPending ? t.saving : t.save}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);
  const [drawerLead, setDrawerLead] = useState<LeadRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");

  const STATUS_LABELS: Record<string, string> = {
    new: t.statusNew,
    contacted: t.statusContacted,
    qualified: t.statusQualified,
    converted: t.statusConverted,
    lost: t.statusLost,
  };

  const SOURCE_LABELS: Record<string, string> = {
    messenger: t.sourceMessenger,
    whatsapp: t.sourceWhatsapp,
    web: t.sourceWebsite,
    other: t.sourceOther,
  };

  const dateLocale = isRTL ? "ar-EG" : "en-US";

  const exportCSV = (leads: LeadRecord[]) => {
    const headers = [t.name, t.phone, t.email, t.leadInterest, t.source, t.status, t.date];
    const rows = leads.map(l => [
      l.name ?? "",
      l.phone ?? "",
      l.email ?? "",
      l.interest ?? "",
      SOURCE_LABELS[l.sourceChannel ?? ""] ?? l.sourceChannel ?? "",
      STATUS_LABELS[l.status ?? ""] ?? l.status ?? "",
      l.createdAt ? new Date(l.createdAt).toLocaleDateString(dateLocale) : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: leads = [], isLoading } = useQuery<LeadRecord[]>({ queryKey: ["/api/leads"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LeadRecord>) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setDialogOpen(false);
      toast({ title: t.leadCreated });
    },
    onError: () => toast({ title: t.leadCreateFail, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeadRecord> }) => apiRequest("PATCH", `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setEditLead(null);
      if (drawerLead) {
        const updated = leads.find(l => l.id === drawerLead.id);
        if (updated) setDrawerLead(updated);
      }
      toast({ title: t.leadUpdated });
    },
    onError: () => toast({ title: t.leadUpdateFail, variant: "destructive" }),
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
    <div className="space-y-6" data-testid="page-leads" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isEcommerce ? t.navAllOrders : t.leadsTitle}</h1>
          <p className="text-muted-foreground">{isEcommerce ? t.ordersBotSubtitle : t.leadsSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportCSV(filtered)} data-testid="button-export-csv">
            <Download className="h-4 w-4 me-2" />
            {t.exportCSV}
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-lead">
            <Plus className="h-4 w-4 me-2" />
            {t.addLead}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={t.searchByNameOrPhone}
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-leads"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <SelectValue placeholder={t.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses2}</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40" data-testid="select-filter-source">
            <SelectValue placeholder={t.source} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allSources}</SelectItem>
            <SelectItem value="messenger">{t.sourceMessenger}</SelectItem>
            <SelectItem value="whatsapp">{t.sourceWhatsapp}</SelectItem>
            <SelectItem value="web">{t.sourceWebsite}</SelectItem>
            <SelectItem value="other">{t.sourceOther}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterStatus("all"); setFilterSource("all"); setFilterSearch(""); }}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 me-1" />
            {t.clearFilters}
          </Button>
        )}
        <span className="text-sm text-muted-foreground ms-auto">{filtered.length} {t.leadCount}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{t.noLeadsYet}</p>
              <p className="text-sm text-muted-foreground">{t.noLeadsYetDesc}</p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">{t.noLeadsMatchFilters}</p>
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterSource("all"); setFilterSearch(""); }}>
              {t.clearFilters}
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
                    <th className="text-start py-3 px-4 font-medium">{t.name}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.phone}</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">{t.email}</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">{t.leadInterest}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.source}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.status}</th>
                    <th className="text-start py-3 px-4 font-medium hidden lg:table-cell">{t.date}</th>
                    <th className="text-end py-3 px-4 font-medium">{t.actions}</th>
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
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{"—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {CHANNEL_ICON[lead.sourceChannel ?? ""] ?? null}
                          <span className="text-muted-foreground">{SOURCE_LABELS[lead.sourceChannel ?? ""] ?? lead.sourceChannel ?? "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={STATUS_COLORS[lead.status] ?? ""}>{STATUS_LABELS[lead.status] ?? lead.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(dateLocale) : "—"}
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
        <SheetContent className="w-80 sm:w-96" dir={isRTL ? "rtl" : "ltr"}>
          <SheetHeader>
            <SheetTitle>{t.leadDetails}</SheetTitle>
          </SheetHeader>
          {drawerLead && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-3">
                {[
                  { label: t.name, value: drawerLead.name },
                  { label: t.phone, value: drawerLead.phone },
                  { label: t.email, value: drawerLead.email },
                  { label: t.source, value: SOURCE_LABELS[drawerLead.sourceChannel ?? ""] ?? drawerLead.sourceChannel },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2 border-b pb-2">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="text-end">{value ?? "—"}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-b pb-2">
                  <span className="text-muted-foreground font-medium">{t.status}</span>
                  <Badge className={STATUS_COLORS[drawerLead.status] ?? ""}>{STATUS_LABELS[drawerLead.status] ?? drawerLead.status}</Badge>
                </div>
                <div className="flex justify-between gap-2 border-b pb-2">
                  <span className="text-muted-foreground font-medium">{t.date}</span>
                  <span>{drawerLead.createdAt ? new Date(drawerLead.createdAt).toLocaleDateString(dateLocale) : "—"}</span>
                </div>
                {drawerLead.notes && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">{t.notes}</p>
                    <p className="text-sm bg-muted rounded-md p-2">{drawerLead.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <p className="font-medium mb-2">{t.updateStatus}</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={drawerLead.status === s ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => {
                        updateMutation.mutate({ id: drawerLead.id, data: { status: s } });
                        setDrawerLead({ ...drawerLead, status: s });
                      }}
                      data-testid={`button-drawer-status-${s}`}
                    >
                      {STATUS_LABELS[s] ?? s}
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
                <Pencil className="h-4 w-4 me-2" />
                {t.editLead}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.addLead}</DialogTitle></DialogHeader>
          <LeadForm onSave={data => createMutation.mutate(data)} onCancel={() => setDialogOpen(false)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLead} onOpenChange={open => !open && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.editLead}</DialogTitle></DialogHeader>
          {editLead && <LeadForm initial={editLead} onSave={data => updateMutation.mutate({ id: editLead.id, data })} onCancel={() => setEditLead(null)} isPending={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
