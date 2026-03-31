import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  Thermometer,
  Snowflake,
  Loader2,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { format } from "date-fns";
import type { Lead, Reminder, LeadState } from "@shared/schema";
import { SCORE_COLORS } from "@/lib/scoring";
import { LeadDetailPanel } from "@/components/lead-detail-panel";

type ReminderWithLead = Reminder & { lead: Lead | null };

interface MyDayData {
  todayFollowUps: ReminderWithLead[];
  newLeads: Lead[];
  overdueFollowUps: ReminderWithLead[];
  doneToday: ReminderWithLead[];
}

const OUTCOME_OPTIONS = [
  { value: "answered", labelKey: "outcomeAnswered" },
  { value: "no_answer", labelKey: "outcomeNoAnswer" },
  { value: "interested", labelKey: "outcomeInterested" },
  { value: "not_interested", labelKey: "outcomeNotInterested" },
  { value: "needs_time", labelKey: "outcomeNeedsTime" },
  { value: "requested_visit", labelKey: "outcomeRequestedVisit" },
] as const;

function ScoreBadge({ score }: { score: string | null }) {
  const { t } = useLanguage();
  const s = (score ?? "warm") as "hot" | "warm" | "cold";
  const label = s === "hot" ? t.scoreHot : s === "warm" ? t.scoreWarm : t.scoreCold;
  const icon = s === "hot" ? <Flame className="h-2.5 w-2.5" /> : s === "warm" ? <Thermometer className="h-2.5 w-2.5" /> : <Snowflake className="h-2.5 w-2.5" />;
  return (
    <Badge className={`text-xs gap-0.5 border ${SCORE_COLORS[s]}`}>
      {icon}{label}
    </Badge>
  );
}

function FollowUpCard({
  item,
  isOverdue = false,
  isDone = false,
  onLogCall,
  onOpenLead,
}: {
  item: ReminderWithLead;
  isOverdue?: boolean;
  isDone?: boolean;
  onLogCall?: (item: ReminderWithLead) => void;
  onOpenLead?: (lead: Lead) => void;
}) {
  const { t } = useLanguage();
  const lead = item.lead;
  const isWhatsApp = lead?.channel === "واتساب";
  const displayName = lead?.name
    ? lead.name.startsWith("واتساب - ")
      ? lead.phone ?? lead.name.replace("واتساب - ", "")
      : lead.name
    : item.title;

  return (
    <Card
      className={`transition-all ${isOverdue ? "border-red-300 bg-red-50 dark:bg-red-950/20" : isDone ? "opacity-60" : ""}`}
      data-testid={`card-followup-${item.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isWhatsApp && (
                <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400">
                  <SiWhatsapp className="h-2.5 w-2.5" />
                  واتساب
                </Badge>
              )}
              <span className="font-semibold text-sm truncate" data-testid={`text-followup-name-${item.id}`}>
                {displayName}
              </span>
              {lead?.score && <ScoreBadge score={lead.score} />}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {t.overdueFollowUps}
                </Badge>
              )}
              {isDone && (
                <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {t.doneToday}
                </Badge>
              )}
            </div>

            <div className="mt-1.5 space-y-1">
              {lead?.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span dir="ltr">{lead.phone}</span>
                </div>
              )}
              {lead?.unitType && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span>{lead.unitType}</span>
                </div>
              )}
              {lead?.lastActionDate && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{t.lastContact}: {format(new Date(lead.lastActionDate), "dd/MM/yyyy")}</span>
                </div>
              )}
              {lead?.notes && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {t.lastNote}: {lead.notes}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>{format(new Date(item.dueDate), "dd/MM/yyyy HH:mm")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            {lead && onOpenLead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenLead(lead)}
                data-testid={`button-open-lead-followup-${item.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                فتح الليد
              </Button>
            )}
            {!isDone && onLogCall && (
              <Button
                size="sm"
                onClick={() => onLogCall(item)}
                data-testid={`button-log-call-${item.id}`}
              >
                <Phone className="h-3.5 w-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                {t.logCall}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewLeadCard({
  lead,
  onLogCall,
  onOpenLead,
}: {
  lead: Lead;
  onLogCall?: (lead: Lead) => void;
  onOpenLead?: (lead: Lead) => void;
}) {
  const { t } = useLanguage();
  const isWhatsApp = lead.channel === "واتساب";
  const displayName = lead.name
    ? lead.name.startsWith("واتساب - ")
      ? lead.phone ?? lead.name.replace("واتساب - ", "")
      : lead.name
    : t.noName;

  return (
    <Card data-testid={`card-newlead-${lead.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isWhatsApp && (
                <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400">
                  <SiWhatsapp className="h-2.5 w-2.5" />
                  واتساب
                </Badge>
              )}
              <span className="font-semibold text-sm truncate" data-testid={`text-newlead-name-${lead.id}`}>
                {displayName}
              </span>
              {lead.score && <ScoreBadge score={lead.score} />}
            </div>
            <div className="mt-1.5 space-y-1">
              {lead.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span dir="ltr">{lead.phone}</span>
                </div>
              )}
              {lead.unitType && (
                <div className="text-xs text-muted-foreground">
                  {t.interestedProject}: {lead.unitType}
                </div>
              )}
              {lead.createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{format(new Date(lead.createdAt), "dd/MM/yyyy")}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {onOpenLead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenLead(lead)}
                data-testid={`button-open-lead-newlead-${lead.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                فتح الليد
              </Button>
            )}
            {onLogCall && (
              <Button
                size="sm"
                onClick={() => onLogCall(lead)}
                data-testid={`button-log-call-newlead-${lead.id}`}
              >
                <Phone className="h-3.5 w-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                {t.logCall}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LogCallDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string | null;
  leadName: string;
  reminderId?: string;
}

function LogCallDialog({ open, onClose, leadId, leadName, reminderId }: LogCallDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  const logCallMutation = useMutation({
    mutationFn: async () => {
      if (!leadId || !outcome) throw new Error("leadId and outcome required");
      const parsedDuration = durationSeconds ? parseInt(durationSeconds, 10) : null;
      return apiRequest("POST", "/api/call-logs", {
        leadId,
        outcome,
        notes: notes || null,
        durationSeconds: parsedDuration && !isNaN(parsedDuration) ? parsedDuration : null,
        reminderId: reminderId || null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.logCallSuccess });
      setOutcome("");
      setNotes("");
      setDurationSeconds("");
      setNextFollowUpDate("");
      onClose();
    },
    onError: () => {
      toast({ title: t.logCallError, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-log-call">
        <DialogHeader>
          <DialogTitle>{t.logCall} — {leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t.callOutcome} *</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger data-testid="select-call-outcome">
                <SelectValue placeholder={t.selectOutcome} />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t[opt.labelKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.callDuration}</Label>
            <input
              type="number"
              min="0"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              placeholder={t.callDurationPlaceholder}
              data-testid="input-call-duration"
            />
          </div>

          <div className="space-y-2">
            <Label>{t.callNotes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t.callNotes}
              data-testid="textarea-call-notes"
            />
          </div>

          <div className="space-y-2">
            <Label>{t.nextFollowUpDate}</Label>
            <input
              type="datetime-local"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              data-testid="input-next-followup-date"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
          <Button
            onClick={() => logCallMutation.mutate()}
            disabled={!outcome || logCallMutation.isPending}
            data-testid="button-save-call-log"
          >
            {logCallMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompletionRatesSection() {
  const { t } = useLanguage();
  const { data: rates = [], isLoading } = useQuery<{ agentId: string; agentName: string; scheduled: number; completed: number }[]>({
    queryKey: ["/api/my-day/completion-rates"],
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const relevantRates = rates.filter(r => r.scheduled > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          {t.agentCompletionRates}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {relevantRates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noCompletionData}</p>
        ) : (
          <div className="space-y-3">
            {relevantRates.map((rate) => {
              const pct = rate.scheduled > 0 ? Math.round((rate.completed / rate.scheduled) * 100) : 0;
              return (
                <div key={rate.agentId} data-testid={`row-completion-${rate.agentId}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{rate.agentName}</span>
                    <span className="text-sm text-muted-foreground">
                      {rate.completed}/{rate.scheduled} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyDayPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [logCallDialog, setLogCallDialog] = useState<{
    open: boolean;
    leadId: string | null;
    leadName: string;
    reminderId?: string;
  }>({ open: false, leadId: null, leadName: "" });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const isManager = user?.role === "sales_manager" || user?.role === "team_leader" || user?.role === "super_admin" || user?.role === "admin";

  const { data, isLoading } = useQuery<MyDayData>({
    queryKey: ["/api/my-day"],
  });

  const { data: states = [] } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: (updatedLead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead((prev) => (prev?.id === updatedLead.id ? updatedLead : prev));
      toast({ title: t.leadUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.leadUpdatedError, variant: "destructive" });
    },
  });

  const pendingCount = (data?.todayFollowUps.length ?? 0) + (data?.overdueFollowUps.length ?? 0) + (data?.newLeads.length ?? 0);

  const openLogCallFromReminder = (item: ReminderWithLead) => {
    setLogCallDialog({
      open: true,
      leadId: item.leadId ?? null,
      leadName: item.lead?.name ?? item.title,
      reminderId: item.id,
    });
  };

  const openLogCallFromLead = (lead: Lead) => {
    setLogCallDialog({
      open: true,
      leadId: lead.id,
      leadName: lead.name ?? t.noName,
    });
  };

  const openLeadPanel = (lead: Lead) => {
    setSelectedLead(lead);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2" data-testid="text-myday-title">
            {t.myDayTitle}
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs" data-testid="badge-pending-count">
                {pendingCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{t.myDaySubtitle}</p>
        </div>
      </div>

      <Tabs defaultValue="followups">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="followups" data-testid="tab-today-followups">
            {t.todayFollowUps}
            {(data?.todayFollowUps.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 rtl:ml-0 rtl:mr-1.5 text-xs">
                {data!.todayFollowUps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue">
            {t.overdueFollowUps}
            {(data?.overdueFollowUps.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1.5 rtl:ml-0 rtl:mr-1.5 text-xs">
                {data!.overdueFollowUps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="new" data-testid="tab-new-leads">
            {t.myDayNewLeads}
            {(data?.newLeads.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 rtl:ml-0 rtl:mr-1.5 text-xs">
                {data!.newLeads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="done" data-testid="tab-done-today">
            {t.doneToday}
            {(data?.doneToday.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 rtl:ml-0 rtl:mr-1.5 text-xs">
                {data!.doneToday.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followups" className="mt-4 space-y-3">
          {(data?.overdueFollowUps.length ?? 0) > 0 && (
            <div className="space-y-2" data-testid="section-overdue">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t.overdueFollowUps} ({data!.overdueFollowUps.length})
                </span>
              </div>
              {data!.overdueFollowUps.map((item) => (
                <FollowUpCard
                  key={item.id}
                  item={item}
                  isOverdue
                  onLogCall={openLogCallFromReminder}
                  onOpenLead={openLeadPanel}
                />
              ))}
              {(data?.todayFollowUps.length ?? 0) > 0 && (
                <div className="border-t pt-2">
                  <span className="text-sm font-medium text-muted-foreground">{t.todayFollowUps}</span>
                </div>
              )}
            </div>
          )}
          {(data?.todayFollowUps.length ?? 0) === 0 && (data?.overdueFollowUps.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>{t.noFollowUpsToday}</p>
              </CardContent>
            </Card>
          ) : (
            data!.todayFollowUps.map((item) => (
              <FollowUpCard
                key={item.id}
                item={item}
                onLogCall={openLogCallFromReminder}
                onOpenLead={openLeadPanel}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="overdue" className="mt-4 space-y-3">
          {(data?.overdueFollowUps.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>{t.noFollowUpsToday}</p>
              </CardContent>
            </Card>
          ) : (
            data!.overdueFollowUps.map((item) => (
              <FollowUpCard
                key={item.id}
                item={item}
                isOverdue
                onLogCall={openLogCallFromReminder}
                onOpenLead={openLeadPanel}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="new" className="mt-4 space-y-3">
          {(data?.newLeads.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>{t.noNewLeads}</p>
              </CardContent>
            </Card>
          ) : (
            data!.newLeads.map((lead) => (
              <NewLeadCard key={lead.id} lead={lead} onLogCall={openLogCallFromLead} onOpenLead={openLeadPanel} />
            ))
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-4 space-y-3">
          {(data?.doneToday.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>{t.noFollowUpsToday}</p>
              </CardContent>
            </Card>
          ) : (
            data!.doneToday.map((item) => (
              <FollowUpCard key={item.id} item={item} isDone />
            ))
          )}
        </TabsContent>
      </Tabs>

      {isManager && (
        <div className="pt-2">
          <CompletionRatesSection />
        </div>
      )}

      <LogCallDialog
        open={logCallDialog.open}
        onClose={() => setLogCallDialog({ open: false, leadId: null, leadName: "" })}
        leadId={logCallDialog.leadId}
        leadName={logCallDialog.leadName}
        reminderId={logCallDialog.reminderId}
      />

      <LeadDetailPanel
        lead={selectedLead}
        states={states}
        onClose={() => setSelectedLead(null)}
        onUpdate={(data) => {
          if (selectedLead) {
            updateLeadMutation.mutate({ id: selectedLead.id, data });
          }
        }}
      />
    </div>
  );
}
