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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Pencil, X, Clock, Building2, Phone, Mail, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import type { PlatformLead, PlatformLeadHistory } from "@shared/schema";
import { PLATFORM_LEAD_STAGES, PLATFORM_LEAD_STAGE_LABELS, PLATFORM_LEAD_SOURCES } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  demo_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  demo_done: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  proposal_sent: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  negotiation: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  won: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function PlatformLeadForm({ initial, onSave, onCancel, isPending, platformAdmins }: {
  initial?: Partial<PlatformLead>;
  onSave: (data: Partial<PlatformLead>) => void;
  onCancel: () => void;
  isPending: boolean;
  platformAdmins: { username: string; firstName?: string | null; lastName?: string | null }[];
}) {
  const { t } = useLanguage();
  const SOURCE_LABELS: Record<string, string> = {
    website: t.sourceWebsite,
    referral: t.sourceReferral,
    social: t.sourceSocial,
    cold_outreach: t.sourceColdOutreach,
  };
  const [form, setForm] = useState({
    companyName: initial?.companyName ?? "",
    contactName: initial?.contactName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    source: initial?.source ?? "website",
    assignedRep: initial?.assignedRep ?? "",
    notes: initial?.notes ?? "",
    nextActionDate: initial?.nextActionDate ? new Date(initial.nextActionDate).toISOString().slice(0, 10) : "",
    dealValue: initial?.dealValue != null ? String(initial.dealValue) : "",
    stage: initial?.stage ?? "new_lead",
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>{t.platLeadsFormCompany}</Label>
        <Input data-testid="input-platform-company-name" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder={t.platLeadsFormCompanyPlaceholder} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t.platLeadsFormContact}</Label>
          <Input data-testid="input-platform-contact-name" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder={t.platLeadsFormContactPlaceholder} />
        </div>
        <div>
          <Label>{t.platLeadsFormPhone}</Label>
          <Input data-testid="input-platform-phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" dir="ltr" />
        </div>
      </div>
      <div>
        <Label>{t.platLeadsFormEmail}</Label>
        <Input data-testid="input-platform-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" dir="ltr" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t.platLeadsFormSource}</Label>
          <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
            <SelectTrigger data-testid="select-platform-source"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t.platLeadsFormStage}</Label>
          <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
            <SelectTrigger data-testid="select-platform-stage"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{PLATFORM_LEAD_STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t.platLeadsFormRep}</Label>
          <Select value={form.assignedRep || "__none__"} onValueChange={v => setForm(f => ({ ...f, assignedRep: v === "__none__" ? "" : v }))}>
            <SelectTrigger data-testid="select-platform-rep"><SelectValue placeholder={t.platLeadsFormRepPlaceholder} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t.platLeadsFormNone}</SelectItem>
              {platformAdmins.map(u => (
                <SelectItem key={u.username} value={u.username}>
                  {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t.platLeadsFormDeal}</Label>
          <Input data-testid="input-platform-deal-value" type="number" value={form.dealValue} onChange={e => setForm(f => ({ ...f, dealValue: e.target.value }))} placeholder="0" dir="ltr" />
        </div>
      </div>
      <div>
        <Label>{t.platLeadsFormNextAction}</Label>
        <Input data-testid="input-platform-next-action" type="date" value={form.nextActionDate} onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))} dir="ltr" />
      </div>
      <div>
        <Label>{t.platLeadsFormNotes}</Label>
        <Textarea data-testid="input-platform-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-platform-lead">{t.ticketCancelBtn}</Button>
        <Button
          onClick={() => onSave({
            ...form,
            stage: form.stage as PlatformLead["stage"],
            dealValue: form.dealValue || undefined,
            nextActionDate: form.nextActionDate ? new Date(form.nextActionDate) : undefined,
            contactName: form.contactName || undefined,
            email: form.email || undefined,
            phone: form.phone || undefined,
            assignedRep: form.assignedRep || undefined,
            notes: form.notes || undefined,
          })}
          disabled={isPending || !form.companyName}
          data-testid="button-save-platform-lead"
        >
          {isPending ? t.platLeadsFormSaving : t.platLeadsFormSave}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ActivityTimeline({ leadId }: { leadId: string }) {
  const { data: history = [], isLoading } = useQuery<PlatformLeadHistory[]>({
    queryKey: ["/api/platform/leads", leadId, "history"],
    queryFn: async () => {
      const res = await fetch(`/api/platform/leads/${leadId}/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const { t, isRTL } = useLanguage();
  const dateLocale = isRTL ? ar : enUS;
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (history.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">{t.platLeadsNoActivity}</p>;

  return (
    <div className="space-y-3">
      {[...history].reverse().map(entry => (
        <div key={entry.id} className="flex gap-3 text-sm" data-testid={`activity-entry-${entry.id}`}>
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{entry.action === "stage_change" ? `${t.platLeadsStageChange}: ${PLATFORM_LEAD_STAGE_LABELS[entry.fromStage as keyof typeof PLATFORM_LEAD_STAGE_LABELS] ?? entry.fromStage} → ${PLATFORM_LEAD_STAGE_LABELS[entry.toStage as keyof typeof PLATFORM_LEAD_STAGE_LABELS] ?? entry.toStage}` : entry.description}</p>
            {entry.performedBy && <p className="text-muted-foreground text-xs">{entry.performedBy}</p>}
            <p className="text-muted-foreground text-xs">{entry.createdAt ? format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm", { locale: dateLocale }) : "—"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlatformLeadsPage() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const dateLocale = isRTL ? ar : enUS;
  const SOURCE_LABELS: Record<string, string> = {
    website: t.sourceWebsite,
    referral: t.sourceReferral,
    social: t.sourceSocial,
    cold_outreach: t.sourceColdOutreach,
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<PlatformLead | null>(null);
  const [drawerLead, setDrawerLead] = useState<PlatformLead | null>(null);
  const [filterStage, setFilterStage] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery<PlatformLead[]>({ queryKey: ["/api/platform/leads"] });
  const { data: users = [] } = useQuery<{ username: string; firstName?: string | null; lastName?: string | null; role?: string }[]>({ queryKey: ["/api/users"] });
  const platformAdmins = users.filter(u => u.role === "platform_admin" || u.role === "super_admin");

  const createMutation = useMutation({
    mutationFn: (data: Partial<PlatformLead>) => apiRequest("POST", "/api/platform/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/leads"] });
      setDialogOpen(false);
      toast({ title: t.platLeadsAddSuccess });
    },
    onError: () => toast({ title: t.platLeadsAddFail, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlatformLead> }) => apiRequest("PATCH", `/api/platform/leads/${id}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/leads"] });
      if (drawerLead?.id === vars.id) {
        const updated = leads.find(l => l.id === vars.id);
        if (updated) setDrawerLead({ ...updated, ...vars.data });
      }
      setEditLead(null);
      toast({ title: t.platLeadsUpdateSuccess });
    },
    onError: () => toast({ title: t.platLeadsUpdateFail, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/platform/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/leads"] });
      setDrawerLead(null);
      toast({ title: t.platLeadsDeleteSuccess });
    },
    onError: () => toast({ title: t.platLeadsDeleteFail, variant: "destructive" }),
  });

  const filtered = leads.filter(l => {
    if (filterStage !== "all" && l.stage !== filterStage) return false;
    if (filterSource !== "all" && l.source !== filterSource) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return (l.companyName ?? "").toLowerCase().includes(q)
        || (l.contactName ?? "").toLowerCase().includes(q)
        || (l.email ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const hasFilters = filterStage !== "all" || filterSource !== "all" || filterSearch;

  return (
    <div className="space-y-6" data-testid="page-platform-leads" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.platLeadsTitle}</h1>
          <p className="text-muted-foreground">{t.platLeadsDesc}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-platform-lead">
          <Plus className="h-4 w-4 me-2" />
          {t.platLeadsNewBtn}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={t.platLeadsSearchPlaceholder}
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-platform-leads"
        />
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-44" data-testid="select-filter-platform-stage">
            <SelectValue placeholder={t.platLeadsFilterStage} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.platLeadsAllStages}</SelectItem>
            {PLATFORM_LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{PLATFORM_LEAD_STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40" data-testid="select-filter-platform-source">
            <SelectValue placeholder={t.platLeadsFilterSource} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.pipelineAllSources}</SelectItem>
            {PLATFORM_LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStage("all"); setFilterSource("all"); setFilterSearch(""); }} data-testid="button-clear-platform-filters">
            <X className="h-4 w-4 me-1" />
            {t.platLeadsClear}
          </Button>
        )}
        <span className="text-sm text-muted-foreground ms-auto">{filtered.length} {t.platLeadsCount}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{t.platLeadsEmpty}</p>
              <p className="text-sm text-muted-foreground">{t.platLeadsEmptyDesc}</p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">{t.platLeadsNoResults}</p>
            <Button variant="ghost" size="sm" onClick={() => { setFilterStage("all"); setFilterSource("all"); setFilterSearch(""); }}>{t.platLeadsClearFilters}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-3 px-4 font-medium">{t.platLeadsColCompany}</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">{t.platLeadsColContact}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.platLeadsColStage}</th>
                    <th className="text-start py-3 px-4 font-medium hidden lg:table-cell">{t.platLeadsColSource}</th>
                    <th className="text-start py-3 px-4 font-medium hidden lg:table-cell">{t.platLeadsColDeal}</th>
                    <th className="text-start py-3 px-4 font-medium hidden xl:table-cell">{t.platLeadsColNextAction}</th>
                    <th className="text-end py-3 px-4 font-medium">{t.platLeadsColAction}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <tr
                      key={lead.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setDrawerLead(lead)}
                      data-testid={`row-platform-lead-${lead.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{lead.companyName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{lead.contactName ?? "—"}</td>
                      <td className="py-3 px-4">
                        <Badge className={STAGE_COLORS[lead.stage] ?? ""}>{PLATFORM_LEAD_STAGE_LABELS[lead.stage as keyof typeof PLATFORM_LEAD_STAGE_LABELS] ?? lead.stage}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{lead.dealValue ? `$${lead.dealValue.toLocaleString()}` : "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden xl:table-cell">
                        {lead.nextActionDate ? format(new Date(lead.nextActionDate), "dd MMM yyyy", { locale: dateLocale }) : "—"}
                      </td>
                      <td className="py-3 px-4 text-end" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => setEditLead(lead)} data-testid={`button-edit-platform-lead-${lead.id}`}>
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
        <SheetContent className="w-80 sm:w-[440px] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          <SheetHeader>
            <SheetTitle>{t.platLeadsDrawerTitle}</SheetTitle>
          </SheetHeader>
          {drawerLead && (
            <div className="mt-4 space-y-5 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-base">{drawerLead.companyName}</p>
                    {drawerLead.contactName && <p className="text-muted-foreground text-xs">{drawerLead.contactName}</p>}
                  </div>
                </div>
                {drawerLead.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span dir="ltr">{drawerLead.email}</span>
                  </div>
                )}
                {drawerLead.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span dir="ltr">{drawerLead.phone}</span>
                  </div>
                )}
                {drawerLead.dealValue && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>${drawerLead.dealValue.toLocaleString()}</span>
                  </div>
                )}
                {drawerLead.nextActionDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(drawerLead.nextActionDate), "dd MMM yyyy", { locale: dateLocale })}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge className={STAGE_COLORS[drawerLead.stage] ?? ""}>{PLATFORM_LEAD_STAGE_LABELS[drawerLead.stage as keyof typeof PLATFORM_LEAD_STAGE_LABELS] ?? drawerLead.stage}</Badge>
                  <Badge variant="outline">{SOURCE_LABELS[drawerLead.source ?? ""] ?? drawerLead.source}</Badge>
                  {drawerLead.assignedRep && <Badge variant="secondary">{drawerLead.assignedRep}</Badge>}
                </div>
              </div>

              {drawerLead.notes && (
                <div>
                  <p className="text-muted-foreground font-medium mb-1 text-xs">{t.platLeadsNotes}</p>
                  <p className="text-sm bg-muted rounded-md p-3">{drawerLead.notes}</p>
                </div>
              )}

              <div className="pt-1">
                <p className="font-medium mb-2 text-xs text-muted-foreground">{t.platLeadsChangeStage}</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_LEAD_STAGES.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={drawerLead.stage === s ? "default" : "outline"}
                      className="text-xs h-7 px-2"
                      onClick={() => {
                        updateMutation.mutate({ id: drawerLead.id, data: { stage: s } });
                        setDrawerLead({ ...drawerLead, stage: s });
                      }}
                      data-testid={`button-platform-stage-${s}`}
                    >
                      {PLATFORM_LEAD_STAGE_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => { setEditLead(drawerLead); setDrawerLead(null); }} data-testid="button-drawer-edit-platform-lead">
                  <Pencil className="h-4 w-4 me-2" />
                  {t.platLeadsEditBtn}
                </Button>
                <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(drawerLead.id)} disabled={deleteMutation.isPending} data-testid="button-drawer-delete-platform-lead">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <p className="font-medium mb-3">{t.platLeadsActivity}</p>
                <ActivityTimeline leadId={drawerLead.id} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.platLeadsAddTitle}</DialogTitle></DialogHeader>
          <PlatformLeadForm
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setDialogOpen(false)}
            isPending={createMutation.isPending}
            platformAdmins={platformAdmins}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editLead} onOpenChange={open => !open && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t.platLeadsEditTitle}</DialogTitle></DialogHeader>
          {editLead && (
            <PlatformLeadForm
              initial={editLead}
              onSave={data => updateMutation.mutate({ id: editLead.id, data })}
              onCancel={() => setEditLead(null)}
              isPending={updateMutation.isPending}
              platformAdmins={platformAdmins}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
