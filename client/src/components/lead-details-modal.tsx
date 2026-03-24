import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import {
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle,
  Plus,
  Bell,
  Activity,
  Home,
  FileText,
  MessageCircle,
  PhoneCall,
  PhoneMissed,
  Users,
  Flame,
  Thermometer,
  Snowflake,
  Shuffle,
} from "lucide-react";
import { computeLeadScore, SCORE_COLORS } from "@/lib/scoring";
import { format } from "date-fns";
import type { Lead, LeadState, LeadHistory, Task, Reminder, LeadUnitInterest, Unit, Project, Communication } from "@shared/schema";

interface LeadDetailsModalProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadDetailsModal({ leadId, isOpen, onClose }: LeadDetailsModalProps) {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const canAutoAssign = user?.role === "super_admin" || user?.role === "admin" || user?.role === "sales_manager";
  const [activeTab, setActiveTab] = useState("overview");
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [commType, setCommType] = useState("");
  const [commNote, setCommNote] = useState("");

  const { data: lead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId,
  });

  const { data: states = [] } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: history = [] } = useQuery<LeadHistory[]>({
    queryKey: ["/api/leads", leadId, "history"],
    enabled: !!leadId,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/leads", leadId, "tasks"],
    enabled: !!leadId,
  });

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/leads", leadId, "reminders"],
    enabled: !!leadId,
  });

  const { data: interests = [] } = useQuery<LeadUnitInterest[]>({
    queryKey: ["/api/leads", leadId, "unit-interests"],
    enabled: !!leadId,
  });

  const { data: commList = [] } = useQuery<Communication[]>({
    queryKey: ["/api/leads", leadId, "communications"],
    enabled: !!leadId,
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createReminderMutation = useMutation({
    mutationFn: (data: { title: string; dueDate: string; leadId: string }) =>
      apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setNewReminderTitle("");
      setNewReminderDate("");
      toast({ title: t.reminderCreated });
    },
  });

  const completeReminderMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/reminders/${id}`, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t.reminderCompleted });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tasks"] });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/leads/${leadId}/auto-assign`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-load"] });
      toast({ title: t.autoAssignSuccess });
    },
    onError: () => {
      toast({ title: t.autoAssignError, variant: "destructive" });
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: (data: { type: string; note?: string }) =>
      apiRequest("POST", `/api/leads/${leadId}/communications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "communications"] });
      setCommType("");
      setCommNote("");
      toast({ title: t.communicationLogged });
    },
  });

  const handleLogCommunication = () => {
    if (!commType || !leadId) return;
    createCommunicationMutation.mutate({ type: commType, note: commNote || undefined });
  };

  const handleAddReminder = () => {
    if (!newReminderTitle || !newReminderDate || !leadId) return;
    createReminderMutation.mutate({
      title: newReminderTitle,
      dueDate: newReminderDate,
      leadId,
    });
  };

  const currentState = states.find((s) => s.id === lead?.stateId);

  const getUnitDetails = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    const project = unit ? projects.find((p) => p.id === unit.projectId) : null;
    return { unit, project };
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span className="text-lg truncate">{lead.name || t.noName}</span>
              {currentState && (
                <Badge
                  style={{ backgroundColor: currentState.color, color: "white" }}
                >
                  {currentState.name}
                </Badge>
              )}
              {(() => {
                const { score, daysSinceContact } = computeLeadScore(lead);
                const scoreLabel = score === "hot" ? t.scoreHot : score === "warm" ? t.scoreWarm : t.scoreCold;
                const scoreIcon = score === "hot" ? <Flame className="h-3 w-3" /> : score === "warm" ? <Thermometer className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />;
                return (
                  <Badge className={`gap-1 border ${SCORE_COLORS[score]}`} title={`${daysSinceContact} ${t.daysSinceContact}`} data-testid="badge-score-modal">
                    {scoreIcon}{scoreLabel}
                  </Badge>
                );
              })()}
              {canAutoAssign && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => autoAssignMutation.mutate()}
                  disabled={autoAssignMutation.isPending}
                  data-testid="button-auto-assign"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  {autoAssignMutation.isPending ? t.autoAssigning : t.autoAssign}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="h-4 w-4 mr-1" />
              {t.overview}
            </TabsTrigger>
            <TabsTrigger value="communications" data-testid="tab-communications">
              <MessageCircle className="h-4 w-4 mr-1" />
              {t.communicationLog}
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              <Activity className="h-4 w-4 mr-1" />
              {t.timeline}
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminders">
              <Bell className="h-4 w-4 mr-1" />
              {t.reminders}
            </TabsTrigger>
            <TabsTrigger value="units" data-testid="tab-units">
              <Home className="h-4 w-4 mr-1" />
              {t.interestedUnits}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.contactInfo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.phone && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span dir="ltr">{lead.phone}</span>
                      </div>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50" data-testid="button-whatsapp-primary">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {t.commTypeWhatsapp}
                        </Button>
                      </a>
                    </div>
                  )}
                  {lead.phone2 && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span dir="ltr">{lead.phone2}</span>
                      </div>
                      <a
                        href={`https://wa.me/${lead.phone2.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50" data-testid="button-whatsapp-secondary">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {t.commTypeWhatsapp}
                        </Button>
                      </a>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.propertyInfo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.unitType && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.unitType}</span>
                    </div>
                  )}
                  {lead.budget && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.budget}</span>
                    </div>
                  )}
                  {lead.bedrooms && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{t.bedrooms}:</span>
                      <span>{lead.bedrooms}</span>
                    </div>
                  )}
                  {lead.space && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{t.space}:</span>
                      <span>{lead.space} m²</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.additionalInfo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  {lead.channel && (
                    <div>
                      <span className="text-muted-foreground">{t.channel}: </span>
                      <Badge variant="outline">{lead.channel}</Badge>
                    </div>
                  )}
                  {lead.campaign && (
                    <div>
                      <span className="text-muted-foreground">{t.campaign}: </span>
                      <span>{lead.campaign}</span>
                    </div>
                  )}
                  {lead.assignedTo && (
                    <div>
                      <span className="text-muted-foreground">{t.assignedTo}: </span>
                      <span>{lead.assignedTo}</span>
                    </div>
                  )}
                  {lead.paymentType && (
                    <div>
                      <span className="text-muted-foreground">{t.paymentType}: </span>
                      <span>{lead.paymentType}</span>
                    </div>
                  )}
                  {lead.createdAt && (
                    <div>
                      <span className="text-muted-foreground">{t.createdAt}: </span>
                      <span>{format(new Date(lead.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                  )}
                </div>
                {lead.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">{t.notes}:</p>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {tasks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.tasks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => completeTaskMutation.mutate(task.id)}
                            disabled={task.completed ?? false}
                          >
                            <CheckCircle
                              className={`h-4 w-4 ${task.completed ? "text-green-500" : "text-muted-foreground"}`}
                            />
                          </Button>
                          <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                            {task.title}
                          </span>
                        </div>
                        {task.endDate && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.endDate), "MMM dd")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="communications" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.logCommunication}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { type: "call", icon: <PhoneCall className="h-3.5 w-3.5" />, label: t.commTypeCall, cls: "border-blue-200 text-blue-600 hover:bg-blue-50" },
                      { type: "no_answer", icon: <PhoneMissed className="h-3.5 w-3.5" />, label: t.commTypeNoAnswer, cls: "border-red-200 text-red-600 hover:bg-red-50" },
                      { type: "whatsapp", icon: <MessageCircle className="h-3.5 w-3.5" />, label: t.commTypeWhatsapp, cls: "border-green-200 text-green-600 hover:bg-green-50" },
                      { type: "meeting", icon: <Users className="h-3.5 w-3.5" />, label: t.commTypeMeeting, cls: "border-purple-200 text-purple-600 hover:bg-purple-50" },
                      { type: "note", icon: <FileText className="h-3.5 w-3.5" />, label: t.commTypeNote, cls: "border-gray-200 text-gray-600 hover:bg-gray-50" },
                    ] as const).map(({ type, icon, label, cls }) => (
                      <Button
                        key={type}
                        size="sm"
                        variant="outline"
                        className={`h-7 gap-1.5 text-xs ${cls}`}
                        disabled={createCommunicationMutation.isPending}
                        onClick={() => createCommunicationMutation.mutate({ type, note: undefined })}
                        data-testid={`button-quick-${type}`}
                      >
                        {icon}
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Select value={commType} onValueChange={setCommType}>
                      <SelectTrigger className="flex-1" data-testid="select-comm-type">
                        <SelectValue placeholder={t.selectCommType} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4 text-blue-500" />
                            {t.commTypeCall}
                          </div>
                        </SelectItem>
                        <SelectItem value="no_answer">
                          <div className="flex items-center gap-2">
                            <PhoneMissed className="h-4 w-4 text-red-500" />
                            {t.commTypeNoAnswer}
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            {t.commTypeWhatsapp}
                          </div>
                        </SelectItem>
                        <SelectItem value="meeting">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            {t.commTypeMeeting}
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-orange-500" />
                            {t.commTypeEmail}
                          </div>
                        </SelectItem>
                        <SelectItem value="note">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            {t.commTypeNote}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {lead.phone && commType === "whatsapp" && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" data-testid="button-open-whatsapp">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {t.whatsappChat}
                        </Button>
                      </a>
                    )}
                  </div>
                  <Textarea
                    placeholder={t.communicationNote}
                    value={commNote}
                    onChange={(e) => setCommNote(e.target.value)}
                    className="min-h-[60px]"
                    data-testid="input-comm-note"
                  />
                  <Button
                    onClick={handleLogCommunication}
                    disabled={!commType || createCommunicationMutation.isPending}
                    className="self-end"
                    data-testid="button-log-communication"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.logComm}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {commList.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border rtl:left-auto rtl:right-4" />
                    <div className="space-y-3">
                      {[...commList].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map((comm) => {
                        const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
                          call: { icon: <PhoneCall className="h-4 w-4" />, color: "text-blue-500 bg-blue-50" },
                          no_answer: { icon: <PhoneMissed className="h-4 w-4" />, color: "text-red-500 bg-red-50" },
                          whatsapp: { icon: <MessageCircle className="h-4 w-4" />, color: "text-green-500 bg-green-50" },
                          meeting: { icon: <Users className="h-4 w-4" />, color: "text-purple-500 bg-purple-50" },
                          email: { icon: <Mail className="h-4 w-4" />, color: "text-orange-500 bg-orange-50" },
                          note: { icon: <FileText className="h-4 w-4" />, color: "text-gray-500 bg-gray-50" },
                        };
                        const typeInfo = iconMap[comm.type] || iconMap.note;
                        const typeLabel: Record<string, string> = {
                          call: t.commTypeCall,
                          no_answer: t.commTypeNoAnswer,
                          whatsapp: t.commTypeWhatsapp,
                          meeting: t.commTypeMeeting,
                          email: t.commTypeEmail,
                          note: t.commTypeNote,
                        };
                        return (
                          <div key={comm.id} className="relative pl-10 rtl:pl-0 rtl:pr-10">
                            <div className={`absolute left-2 top-2 w-5 h-5 rounded-full flex items-center justify-center rtl:left-auto rtl:right-2 ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </div>
                            <div className="p-3 rounded-md border">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className={typeInfo.color}>
                                  {typeLabel[comm.type] || comm.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {comm.createdAt && format(new Date(comm.createdAt), "MMM dd, HH:mm")}
                                </span>
                              </div>
                              {comm.note && (
                                <p className="text-sm text-muted-foreground mt-1">{comm.note}</p>
                              )}
                              {comm.userName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.performedBy}: {comm.userName}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    {t.noCommunications}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {(() => {
                  const commTypeLabels: Record<string, string> = {
                    call: t.commTypeCall,
                    no_answer: t.commTypeNoAnswer,
                    whatsapp: t.commTypeWhatsapp,
                    meeting: t.commTypeMeeting,
                    email: t.commTypeEmail,
                    note: t.commTypeNote,
                  };
                  const commTypeColors: Record<string, string> = {
                    call: "bg-blue-500",
                    no_answer: "bg-gray-400",
                    whatsapp: "bg-green-500",
                    meeting: "bg-purple-500",
                    email: "bg-orange-500",
                    note: "bg-yellow-500",
                  };
                  type TimelineEntry = {
                    id: string;
                    date: Date;
                    kind: "history" | "communication";
                    label: string;
                    description?: string | null;
                    by?: string | null;
                    color: string;
                  };
                  const historyEntries: TimelineEntry[] = history.map((h) => ({
                    id: h.id,
                    date: new Date(h.createdAt!),
                    kind: "history",
                    label: h.action,
                    description: h.description,
                    by: h.performedBy,
                    color: "bg-primary",
                  }));
                  const commEntries: TimelineEntry[] = commList.map((c) => ({
                    id: c.id,
                    date: new Date(c.createdAt!),
                    kind: "communication",
                    label: commTypeLabels[c.type] ?? c.type,
                    description: c.note,
                    by: c.userName,
                    color: commTypeColors[c.type] ?? "bg-primary",
                  }));
                  const merged = [...historyEntries, ...commEntries].sort(
                    (a, b) => b.date.getTime() - a.date.getTime()
                  );
                  if (merged.length === 0) {
                    return (
                      <div className="flex h-32 items-center justify-center text-muted-foreground">
                        {t.noDataToDisplay}
                      </div>
                    );
                  }
                  return (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-4">
                        {merged.map((item) => (
                          <div key={`${item.kind}-${item.id}`} className="relative pl-10">
                            <div className={`absolute left-2 top-1 w-4 h-4 rounded-full ${item.color}`} />
                            <div className="p-3 rounded-md border">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{item.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(item.date, "MMM dd, HH:mm")}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                              {item.by && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.performedBy}: {item.by}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.addReminder}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder={t.reminderTitle}
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    className="flex-1"
                    data-testid="input-reminder-title"
                  />
                  <Input
                    type="datetime-local"
                    value={newReminderDate}
                    onChange={(e) => setNewReminderDate(e.target.value)}
                    className="w-48"
                    data-testid="input-reminder-date"
                  />
                  <Button
                    onClick={handleAddReminder}
                    disabled={!newReminderTitle || !newReminderDate}
                    data-testid="button-add-reminder"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.addReminder}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {reminders.length > 0 ? (
                  <div className="space-y-2">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          reminder.isCompleted ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => completeReminderMutation.mutate(reminder.id)}
                            disabled={reminder.isCompleted ?? false}
                          >
                            <CheckCircle
                              className={`h-5 w-5 ${reminder.isCompleted ? "text-green-500" : "text-muted-foreground"}`}
                            />
                          </Button>
                          <div>
                            <p className={reminder.isCompleted ? "line-through" : "font-medium"}>
                              {reminder.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reminder.dueDate && format(new Date(reminder.dueDate), "MMM dd, HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={reminder.isCompleted ? "secondary" : "default"}>
                          {reminder.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    {t.noReminders}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {interests.length > 0 ? (
                  <div className="space-y-3">
                    {interests.map((interest) => {
                      const { unit, project } = getUnitDetails(interest.unitId);
                      if (!unit) return null;
                      return (
                        <div
                          key={interest.id}
                          className="flex items-center justify-between p-3 rounded-md border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                              <Home className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{project?.name || "Unknown Project"}</p>
                              <p className="text-sm text-muted-foreground">
                                {t.unit} {unit.unitNumber} - {unit.area}m² - {unit.bedrooms} {t.bedrooms}
                              </p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="font-bold">
                              {unit.price?.toLocaleString()} {t.currency}
                            </p>
                            <Badge variant={interest.interestLevel === "high" ? "default" : "secondary"}>
                              {interest.interestLevel}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    {t.noDataToDisplay}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
