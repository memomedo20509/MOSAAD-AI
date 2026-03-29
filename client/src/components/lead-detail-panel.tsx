import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone,
  Mail,
  User,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  History,
  ListTodo,
  Plus,
  Trash2,
  Paperclip,
  ArrowRightLeft,
  MessageSquare,
  Edit2,
  X,
  Check,
  Flame,
  Thermometer,
  Snowflake,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CalendarClock,
  PhoneCall,
  ClipboardList,
} from "lucide-react";
import type { Lead, LeadState, Task, LeadHistory, LeadManagerComment, Communication } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { DocumentsTab } from "./documents-tab";
import { WhatsAppPanel } from "./whatsapp-panel";
import { computeLeadScore, SCORE_COLORS } from "@/lib/scoring";

interface LeadDetailPanelProps {
  lead: Lead | null;
  states: LeadState[];
  onClose: () => void;
  onUpdate: (data: Partial<Lead>) => void;
}

type UserSummary = { id: string; username: string; fullName: string; role: string };

const MANAGER_ROLES = ["super_admin", "admin", "sales_admin", "sales_manager", "team_leader", "company_owner"];

function isManagerRole(role: string | undefined | null): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

export function LeadDetailPanel({
  lead,
  states,
  onClose,
  onUpdate,
}: LeadDetailPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [newTask, setNewTask] = useState({ title: "", type: "", description: "" });
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState("");
  const [showManagerNoteInput, setShowManagerNoteInput] = useState(false);
  const [managerNoteContent, setManagerNoteContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [showLogCallForm, setShowLogCallForm] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [callOutcome, setCallOutcome] = useState<string>("answered");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [showAllStates, setShowAllStates] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();

  const canTransfer = currentUser?.role === "super_admin" || currentUser?.role === "sales_admin" || currentUser?.role === "admin";
  const isManager = isManagerRole(currentUser?.role);
  const isAssignedAgent = currentUser && lead && lead.assignedTo === currentUser.id;

  const { data: salesAgents } = useQuery<UserSummary[]>({
    queryKey: ["/api/users"],
    enabled: showTransferDialog && canTransfer,
    select: (users: UserSummary[]) => users.filter((u) => u.role === "sales_agent" || u.role === "sales_admin" || u.role === "team_leader"),
  });

  const transferMutation = useMutation({
    mutationFn: async ({ leadId, toUserId }: { leadId: string; toUserId: string }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/transfer`, { toUserId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setShowTransferDialog(false);
      setTransferToUserId("");
      toast({ title: t.transferLeadSuccess });
    },
    onError: () => {
      toast({ title: t.transferLeadError, variant: "destructive" });
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/leads", lead?.id, "tasks"],
    enabled: !!lead,
  });

  const { data: history, isLoading: historyLoading } = useQuery<LeadHistory[]>({
    queryKey: ["/api/leads", lead?.id, "history"],
    enabled: !!lead,
  });

  const { data: communications = [] } = useQuery<Communication[]>({
    queryKey: ["/api/leads", lead?.id, "communications"],
    enabled: !!lead,
  });

  const { data: managerComments, isLoading: commentsLoading } = useQuery<LeadManagerComment[]>({
    queryKey: ["/api/leads", lead?.id, "manager-comments"],
    enabled: !!lead,
  });

  const unreadManagerComments = managerComments?.filter(c => !c.isReadByAgent) ?? [];

  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      return apiRequest("POST", "/api/tasks", { ...task, leadId: lead?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      setNewTask({ title: "", type: "", description: "" });
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
    },
  });

  const createManagerCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/leads/${lead?.id}/manager-comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "manager-comments"] });
      setManagerNoteContent("");
      setShowManagerNoteInput(false);
      toast({ title: "تم إضافة الملاحظة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل إضافة الملاحظة", variant: "destructive" });
    },
  });

  const editManagerCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiRequest("PATCH", `/api/manager-comments/${id}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "manager-comments"] });
      setEditingCommentId(null);
      setEditingCommentContent("");
      toast({ title: "تم تعديل الملاحظة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل تعديل الملاحظة", variant: "destructive" });
    },
  });

  const deleteManagerCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/manager-comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "manager-comments"] });
      toast({ title: "تم حذف الملاحظة" });
    },
    onError: () => {
      toast({ title: "فشل حذف الملاحظة", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/manager-comments/${id}/mark-read`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "manager-comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager-comments/unread-count"] });
    },
    onError: () => {
      toast({ title: "فشل تحديد القراءة", variant: "destructive" });
    },
  });

  const handleMarkAllRead = () => {
    unreadManagerComments.forEach(c => markReadMutation.mutate(c.id));
  };

  const CALL_OUTCOME_LABELS: Record<string, string> = {
    answered: "رد على المكالمة",
    no_answer: "لم يرد",
    interested: "مهتم",
    not_interested: "غير مهتم",
    needs_time: "يحتاج وقت",
    requested_visit: "طلب زيارة",
  };

  const logCallMutation = useMutation({
    mutationFn: async () => {
      const outcomeLabel = CALL_OUTCOME_LABELS[callOutcome] ?? callOutcome;
      const noteWithOutcome = callNote
        ? `[${outcomeLabel}] ${callNote}`
        : `[${outcomeLabel}]`;
      const res = await apiRequest("POST", `/api/leads/${lead?.id}/communications`, {
        type: callOutcome === "no_answer" ? "no_answer" : "call",
        note: noteWithOutcome,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setShowLogCallForm(false);
      setCallNote("");
      setCallOutcome("answered");
      toast({ title: "تم تسجيل المكالمة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل تسجيل المكالمة", variant: "destructive" });
    },
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async () => {
      if (!followUpDate) return;
      const dueDate = new Date(`${followUpDate}T${followUpTime}:00`);
      const res = await apiRequest("POST", "/api/reminders", {
        leadId: lead?.id,
        userId: currentUser?.id,
        title: `متابعة ${lead?.name || ""}`,
        dueDate: dueDate.toISOString(),
        priority: "medium",
        isCompleted: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "history"] });
      const formattedDate = followUpDate ? format(new Date(`${followUpDate}T${followUpTime}:00`), "dd/MM/yyyy") : "";
      toast({ title: `تم جدولة المتابعة ليوم ${formattedDate}` });
      setFollowUpDate("");
      setFollowUpTime("09:00");
    },
    onError: () => {
      toast({ title: "فشل جدولة المتابعة", variant: "destructive" });
    },
  });

  const handleSave = () => {
    onUpdate(formData);
    setEditMode(false);
    setFormData({});
  };

  const handleEdit = () => {
    setFormData({ ...lead });
    setEditMode(true);
  };

  if (!lead) return null;

  const currentState = states.find((s) => s.id === lead.stateId);
  const currentStateIndex = states.findIndex((s) => s.id === lead.stateId);
  const scoreInfo = computeLeadScore(lead);
  const callCommunications = communications.filter(c => c.type === "call" || c.type === "no_answer");
  const totalCalls = callCommunications.length;
  // lastContactDate: from latest lead_history entry (most authoritative source since all actions write there)
  const latestHistory = history && history.length > 0
    ? history.reduce((latest, h) => {
        const t = new Date(h.createdAt!).getTime();
        return t > new Date(latest.createdAt!).getTime() ? h : latest;
      }, history[0])
    : null;
  const lastContactRaw = latestHistory?.createdAt
    ? new Date(latestHistory.createdAt)
    : lead.lastActionDate
    ? new Date(lead.lastActionDate)
    : lead.createdAt
    ? new Date(lead.createdAt)
    : null;
  const lastContactDate = lastContactRaw ? format(lastContactRaw, "dd/MM/yyyy") : "—";

  return (
    <>
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-xl" data-testid="text-lead-detail-name">
                {lead.name || "No Name"}
              </SheetTitle>
              {currentState && (
                <Badge
                  className="mt-2"
                  style={{
                    backgroundColor: currentState.color + "20",
                    color: currentState.color,
                    borderColor: currentState.color + "40",
                  }}
                >
                  {currentState.name}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {canTransfer && !editMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTransferDialog(true)}
                  data-testid="button-transfer-lead"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                  {t.transferLead}
                </Button>
              )}
              {editMode ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} data-testid="button-save-lead">
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleEdit} data-testid="button-edit-lead">
                  Edit
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Agent banner: unread manager comments */}
        {isAssignedAgent && unreadManagerComments.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-3 py-2 mt-2 text-sm" data-testid="banner-unread-manager-comment">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span>المانجر ترك ملاحظة على هذا الليد</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-7 text-xs"
              onClick={handleMarkAllRead}
              data-testid="button-mark-comment-read"
            >
              تم الاطلاع
            </Button>
          </div>
        )}

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info" data-testid="tab-lead-info">
              <FileText className="h-4 w-4 mr-1" />
              Info
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-lead-tasks">
              <ListTodo className="h-4 w-4 mr-1" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-lead-history">
              <History className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-lead-actions">
              <Phone className="h-4 w-4 mr-1" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-lead-documents">
              <Paperclip className="h-4 w-4 mr-1" />
              Docs
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="info" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editMode ? (
                    <>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={formData.name || ""}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          data-testid="input-edit-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={formData.phone || ""}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          data-testid="input-edit-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Phone</Label>
                        <Input
                          value={formData.phone2 || ""}
                          onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                          data-testid="input-edit-phone2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={formData.email || ""}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          data-testid="input-edit-email"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.name || "No name provided"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.phone || "No phone provided"}</span>
                      </div>
                      {lead.phone2 && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.phone2}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.email || "No email provided"}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lead Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editMode ? (
                    <>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.stateId || ""}
                          onValueChange={(v) => setFormData({ ...formData, stateId: v })}
                        >
                          <SelectTrigger data-testid="select-edit-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.id} value={state.id}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Input
                          value={formData.channel || ""}
                          onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                          data-testid="input-edit-channel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Campaign</Label>
                        <Input
                          value={formData.campaign || ""}
                          onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                          data-testid="input-edit-campaign"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assigned To</Label>
                        <Input
                          value={formData.assignedTo || ""}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                          data-testid="input-edit-assigned"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Channel</p>
                        <p className="font-medium">{lead.channel || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Campaign</p>
                        <p className="font-medium">{lead.campaign || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assigned To</p>
                        <p className="font-medium">{lead.assignedTo || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Request Type</p>
                        <p className="font-medium">{lead.requestType || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unit Type</p>
                        <p className="font-medium">{lead.unitType || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Area</p>
                        <p className="font-medium">{lead.area || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p className="font-medium">{lead.budget || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">{lead.location || "-"}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {lead.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}

              {editMode && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      data-testid="textarea-edit-notes"
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add New Task</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    data-testid="input-new-task-title"
                  />
                  <Select
                    value={newTask.type}
                    onValueChange={(v) => setNewTask({ ...newTask, type: v })}
                  >
                    <SelectTrigger data-testid="select-new-task-type">
                      <SelectValue placeholder="Task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="follow-up">Follow Up</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={2}
                    data-testid="textarea-new-task-description"
                  />
                  <Button
                    className="w-full"
                    onClick={() => createTaskMutation.mutate(newTask)}
                    disabled={!newTask.title || createTaskMutation.isPending}
                    data-testid="button-add-task"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </CardContent>
              </Card>

              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Card key={task.id} className={task.completed ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() =>
                                toggleTaskMutation.mutate({
                                  taskId: task.id,
                                  completed: !task.completed,
                                })
                              }
                              className="mt-0.5"
                            >
                              {task.completed ? (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <div>
                              <p
                                className={`font-medium ${task.completed ? "line-through" : ""}`}
                              >
                                {task.title}
                              </p>
                              {task.type && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {task.type}
                                </Badge>
                              )}
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <ListTodo className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">No tasks yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="m-0 space-y-4">
              {/* Manager Note button - only for managers */}
              {isManager && (
                <div>
                  {showManagerNoteInput ? (
                    <Card className="border-amber-300 dark:border-amber-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          ملاحظة المانجر
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          placeholder="اكتب ملاحظتك التدريبية هنا..."
                          value={managerNoteContent}
                          onChange={(e) => setManagerNoteContent(e.target.value)}
                          rows={3}
                          data-testid="textarea-manager-note"
                          className="border-amber-200 focus:border-amber-400 dark:border-amber-800"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowManagerNoteInput(false);
                              setManagerNoteContent("");
                            }}
                            data-testid="button-cancel-manager-note"
                          >
                            إلغاء
                          </Button>
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => managerNoteContent.trim() && createManagerCommentMutation.mutate(managerNoteContent.trim())}
                            disabled={!managerNoteContent.trim() || createManagerCommentMutation.isPending}
                            data-testid="button-submit-manager-note"
                          >
                            إرسال الملاحظة
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 w-full"
                      onClick={() => setShowManagerNoteInput(true)}
                      data-testid="button-add-manager-note"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      إضافة ملاحظة المانجر
                    </Button>
                  )}
                </div>
              )}

              {/* Manager Comments in timeline */}
              {commentsLoading ? (
                <div className="space-y-3">
                  {[1].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                (() => {
                  const historyItems = (history ?? []).map(item => ({
                    type: "history" as const,
                    id: item.id,
                    createdAt: item.createdAt,
                    data: item,
                  }));
                  const commentItems = (managerComments ?? []).map(c => ({
                    type: "manager_comment" as const,
                    id: c.id,
                    createdAt: c.createdAt,
                    data: c,
                  }));
                  const allItems = [...historyItems, ...commentItems].sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return aTime - bTime;
                  });

                  if (allItems.length === 0) {
                    return (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
                          <p className="text-muted-foreground text-sm">No history yet</p>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {allItems.map((item) => {
                          if (item.type === "manager_comment") {
                            const comment = item.data as LeadManagerComment;
                            const isMyComment = currentUser?.id === comment.managerId;
                            const isBeingEdited = editingCommentId === comment.id;
                            return (
                              <div key={`mc-${comment.id}`} className="relative pl-10" data-testid={`manager-comment-${comment.id}`}>
                                <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-amber-500" />
                                <Card className="border-l-4 border-l-amber-400 dark:border-l-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                        <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">ملاحظة المانجر</span>
                                        {!comment.isReadByAgent && isAssignedAgent && (
                                          <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0">جديد</Badge>
                                        )}
                                        {comment.isReadByAgent && isManager && (
                                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-green-400 text-green-600">
                                            <Check className="h-3 w-3 mr-1" />
                                            تمت القراءة
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">
                                          {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, yyyy h:mm a") : ""}
                                        </span>
                                        {isMyComment && !isBeingEdited && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                                              onClick={() => {
                                                setEditingCommentId(comment.id);
                                                setEditingCommentContent(comment.content);
                                              }}
                                              data-testid={`button-edit-manager-comment-${comment.id}`}
                                            >
                                              <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                              onClick={() => deleteManagerCommentMutation.mutate(comment.id)}
                                              data-testid={`button-delete-manager-comment-${comment.id}`}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                        {isBeingEdited && (
                                          <>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-green-600"
                                              onClick={() => editManagerCommentMutation.mutate({ id: comment.id, content: editingCommentContent })}
                                              disabled={!editingCommentContent.trim() || editManagerCommentMutation.isPending}
                                              data-testid={`button-save-manager-comment-${comment.id}`}
                                            >
                                              <Check className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground"
                                              onClick={() => {
                                                setEditingCommentId(null);
                                                setEditingCommentContent("");
                                              }}
                                              data-testid={`button-cancel-edit-manager-comment-${comment.id}`}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {isBeingEdited ? (
                                      <Textarea
                                        value={editingCommentContent}
                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                        rows={3}
                                        className="mt-2 border-amber-200 focus:border-amber-400"
                                        data-testid={`textarea-edit-manager-comment-${comment.id}`}
                                      />
                                    ) : (
                                      <p className="text-sm mt-2 whitespace-pre-wrap">{comment.content}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {comment.managerName}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          }

                          const historyItem = item.data as LeadHistory;
                          return (
                            <div key={`h-${historyItem.id}`} className="relative pl-10">
                              <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-primary" />
                              <Card>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">{historyItem.action}</p>
                                    <span className="text-xs text-muted-foreground">
                                      {historyItem.createdAt
                                        ? format(new Date(historyItem.createdAt), "MMM d, yyyy h:mm a")
                                        : ""}
                                    </span>
                                  </div>
                                  {historyItem.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {historyItem.description}
                                    </p>
                                  )}
                                  {historyItem.performedBy && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      by {historyItem.performedBy}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </TabsContent>

            <TabsContent value="actions" className="m-0 space-y-4">
              {/* Lead Summary Bar */}
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>آخر تواصل:</span>
                    <span className="font-medium text-foreground">{lastContactDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>المكالمات:</span>
                    <span className="font-medium text-foreground">{totalCalls}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${SCORE_COLORS[scoreInfo.score]}`}
                  data-testid="badge-lead-score-actions"
                >
                  {scoreInfo.score === "hot" ? (
                    <><Flame className="h-3 w-3 mr-1" />هوت</>
                  ) : scoreInfo.score === "warm" ? (
                    <><Thermometer className="h-3 w-3 mr-1" />وورم</>
                  ) : (
                    <><Snowflake className="h-3 w-3 mr-1" />كولد</>
                  )}
                </Badge>
              </div>

              {/* Call Section */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    اتصل الآن
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.phone ? (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 justify-start h-12 text-base" asChild>
                        <a href={`tel:${lead.phone}`} data-testid="button-call-phone">
                          <PhoneCall className="h-5 w-5 mr-2 text-green-600" />
                          {lead.phone}
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 px-4 whitespace-nowrap"
                        onClick={() => setShowLogCallForm(!showLogCallForm)}
                        data-testid="button-toggle-log-call"
                      >
                        <ClipboardList className="h-4 w-4 mr-1" />
                        سجّل مكالمة
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">لا يوجد رقم هاتف</p>
                  )}

                  {showLogCallForm && (
                    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">نتيجة المكالمة</label>
                        <Select value={callOutcome} onValueChange={setCallOutcome}>
                          <SelectTrigger data-testid="select-call-outcome">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="answered">رد على المكالمة</SelectItem>
                            <SelectItem value="no_answer">لم يرد</SelectItem>
                            <SelectItem value="interested">مهتم</SelectItem>
                            <SelectItem value="not_interested">غير مهتم</SelectItem>
                            <SelectItem value="needs_time">يحتاج وقت</SelectItem>
                            <SelectItem value="requested_visit">طلب زيارة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">ملاحظات (اختياري)</label>
                        <Textarea
                          value={callNote}
                          onChange={(e) => setCallNote(e.target.value)}
                          placeholder="أضف ملاحظات عن المكالمة..."
                          rows={2}
                          className="text-sm resize-none"
                          data-testid="textarea-call-note"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => logCallMutation.mutate()}
                          disabled={logCallMutation.isPending}
                          data-testid="button-save-call-log"
                        >
                          {logCallMutation.isPending ? "جاري الحفظ..." : "حفظ المكالمة"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowLogCallForm(false)}
                          data-testid="button-cancel-log-call"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Section */}
              <WhatsAppPanel lead={lead} agentName={currentUser ? `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() || currentUser.username : undefined} />

              {/* Follow-up Scheduler */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-blue-600" />
                    جدول متابعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">التاريخ</label>
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        min={format(new Date(), "yyyy-MM-dd")}
                        className="h-11"
                        data-testid="input-followup-date"
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted-foreground mb-1 block">الوقت</label>
                      <Input
                        type="time"
                        value={followUpTime}
                        onChange={(e) => setFollowUpTime(e.target.value)}
                        className="h-11"
                        data-testid="input-followup-time"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-11"
                    onClick={() => createFollowUpMutation.mutate()}
                    disabled={!followUpDate || createFollowUpMutation.isPending}
                    data-testid="button-schedule-followup"
                  >
                    <CalendarClock className="h-4 w-4 mr-2" />
                    {createFollowUpMutation.isPending ? "جاري الجدولة..." : "جدولة المتابعة"}
                  </Button>
                </CardContent>
              </Card>

              {/* Status Stepper */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">تغيير الحالة</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setShowAllStates(!showAllStates)}
                      data-testid="button-toggle-all-states"
                    >
                      {showAllStates ? "إخفاء" : "عرض كل الحالات"}
                      <ChevronDown className={`h-3 w-3 transition-transform ${showAllStates ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAllStates ? (
                    <div className="grid grid-cols-2 gap-2">
                      {states.map((state) => (
                        <Button
                          key={state.id}
                          variant={lead.stateId === state.id ? "default" : "outline"}
                          size="sm"
                          className="justify-start h-10"
                          onClick={() => onUpdate({ stateId: state.id })}
                          style={
                            lead.stateId === state.id
                              ? { backgroundColor: state.color, borderColor: state.color }
                              : {}
                          }
                          data-testid={`button-state-${state.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {state.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Horizontal stepper: show current + neighbors */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {states.map((state, idx) => {
                          const isCurrent = state.id === lead.stateId;
                          const isNear = Math.abs(idx - currentStateIndex) <= 1;
                          if (!isNear) return null;
                          return (
                            <div key={state.id} className="flex items-center gap-1 shrink-0">
                              {idx > 0 && idx === currentStateIndex - 1 && (
                                <ChevronLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                              <Button
                                variant={isCurrent ? "default" : "outline"}
                                size="sm"
                                className={`h-9 px-3 text-xs whitespace-nowrap ${isCurrent ? "font-semibold shadow-sm" : "opacity-70"}`}
                                onClick={() => !isCurrent && onUpdate({ stateId: state.id })}
                                style={isCurrent ? { backgroundColor: state.color, borderColor: state.color } : {}}
                                data-testid={`button-stepper-state-${state.id}`}
                              >
                                {isCurrent && <Check className="h-3 w-3 mr-1" />}
                                {state.name}
                              </Button>
                              {idx < states.length - 1 && idx === currentStateIndex + 1 && (
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Progress indicator — read-only visualization only */}
                      {states.length > 0 && (
                        <div className="flex gap-1" title="شريط تقدم الحالة">
                          {states.map((state, idx) => (
                            <div
                              key={state.id}
                              className="h-1 flex-1 rounded-full transition-all"
                              style={{
                                backgroundColor: idx <= currentStateIndex ? (currentState?.color || "#6366f1") : undefined,
                                opacity: idx <= currentStateIndex ? 1 : 0.15,
                              }}
                              data-testid={`progress-state-${state.id}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <DocumentsTab entityType="lead" entityId={lead.id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>

    <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.transferLeadTo}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Select value={transferToUserId} onValueChange={setTransferToUserId}>
            <SelectTrigger data-testid="select-transfer-agent">
              <SelectValue placeholder={t.transferLeadTo} />
            </SelectTrigger>
            <SelectContent>
              {(salesAgents || []).map((agent) => (
                <SelectItem key={agent.id} value={agent.id} data-testid={`option-agent-${agent.id}`}>
                  {agent.fullName || agent.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => lead && transferToUserId && transferMutation.mutate({ leadId: lead.id, toUserId: transferToUserId })}
            disabled={!transferToUserId || transferMutation.isPending}
            data-testid="button-confirm-transfer"
          >
            {t.transferLead}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
