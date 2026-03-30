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
  MapPin,
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
  PhoneCall,
  PhoneMissed,
  ClipboardList,
  DollarSign,
  Building2,
  Bell,
  Activity,
  Home,
  MessageCircle,
  Users,
  Shuffle,
  Calculator,
  GitCompare,
  Sparkles,
  Brain,
  Send,
  RefreshCw,
  Copy,
  CheckCheck,
  Loader2,
} from "lucide-react";
import type {
  Lead,
  LeadState,
  Task,
  LeadHistory,
  LeadManagerComment,
  Communication,
  Reminder,
  LeadUnitInterest,
  Unit,
  Project,
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { DocumentsTab } from "./documents-tab";
import { WhatsAppPanel } from "./whatsapp-panel";
import { InstallmentCalculator } from "./installment-calculator";
import { UnitCompare } from "./unit-compare";
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
  const [newTask, setNewTask] = useState({ title: "", type: "", description: "", dueDate: "" });
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
  const [commType, setCommType] = useState("");
  const [commNote, setCommNote] = useState("");
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");
  const [calcUnitId, setCalcUnitId] = useState<string | null>(null);
  const [compareUnitIds, setCompareUnitIds] = useState<Set<string>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // AI panel state
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [aiRepliesLoading, setAiRepliesLoading] = useState(false);
  const [aiRepliesError, setAiRepliesError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    budget: string | null;
    unitType: string | null;
    bedrooms: number | null;
    interestLevel: "hot" | "warm" | "cold" | null;
    summary: string;
  } | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [aiAnalysisApplied, setAiAnalysisApplied] = useState(false);
  const [copiedReplyIdx, setCopiedReplyIdx] = useState<number | null>(null);
  const [aiSendingIdx, setAiSendingIdx] = useState<number | null>(null);
  const [waInjectMessage, setWaInjectMessage] = useState<string | undefined>(undefined);

  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();

  const canTransfer = currentUser?.role === "super_admin" || currentUser?.role === "sales_admin" || currentUser?.role === "admin";
  const canAutoAssign = currentUser?.role === "super_admin" || currentUser?.role === "admin" || currentUser?.role === "sales_manager";
  const isManager = isManagerRole(currentUser?.role);
  const isAssignedAgent = currentUser && lead && lead.assignedTo === currentUser.id;

  const { data: salesAgents } = useQuery<UserSummary[]>({
    queryKey: ["/api/users"],
    enabled: showTransferDialog && canTransfer,
    select: (users: UserSummary[]) => users.filter((u) => u.role === "sales_agent" || u.role === "sales_admin" || u.role === "team_leader"),
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

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/leads", lead?.id, "reminders"],
    enabled: !!lead,
  });

  const { data: interests = [] } = useQuery<LeadUnitInterest[]>({
    queryKey: ["/api/leads", lead?.id, "unit-interests"],
    enabled: !!lead,
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
    enabled: interests.length > 0,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: interests.length > 0,
  });

  const unreadManagerComments = managerComments?.filter(c => !c.isReadByAgent) ?? [];

  const callCommunications = communications.filter(c => c.type === "call" || c.type === "no_answer");
  const totalCalls = callCommunications.length;

  const latestHistory = history && history.length > 0
    ? history.reduce((latest, h) => {
        const tt = new Date(h.createdAt!).getTime();
        return tt > new Date(latest.createdAt!).getTime() ? h : latest;
      }, history[0])
    : null;
  const lastContactRaw = latestHistory?.createdAt
    ? new Date(latestHistory.createdAt)
    : lead?.lastActionDate
    ? new Date(lead.lastActionDate)
    : lead?.createdAt
    ? new Date(lead.createdAt)
    : null;
  const lastContactDate = lastContactRaw ? format(lastContactRaw, "dd/MM/yyyy") : "—";

  // ── Mutations ──────────────────────────────────────────────────────────────

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

  const autoAssignMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/leads/${lead?.id}/auto-assign`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-load"] });
      toast({ title: t.autoAssignSuccess });
    },
    onError: () => {
      toast({ title: t.autoAssignError, variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) =>
      apiRequest("POST", "/api/tasks", { ...task, leadId: lead?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      setNewTask({ title: "", type: "", description: "", dueDate: "" });
      toast({ title: "تم إضافة التاسك بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل إضافة التاسك", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => apiRequest("DELETE", `/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
    },
    onError: () => {
      toast({ title: "فشل حذف التاسك", variant: "destructive" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, { completed }),
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
      toast({ title: "تم تعديل الملاحظة" });
    },
    onError: () => {
      toast({ title: "فشل تعديل الملاحظة", variant: "destructive" });
    },
  });

  const deleteManagerCommentMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/manager-comments/${id}`),
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
  });

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
      const noteWithOutcome = callNote ? `[${outcomeLabel}] ${callNote}` : `[${outcomeLabel}]`;
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

  const createCommunicationMutation = useMutation({
    mutationFn: (data: { type: string; note?: string }) =>
      apiRequest("POST", `/api/leads/${lead?.id}/communications`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "communications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "history"] });
      setCommType("");
      setCommNote("");
      toast({ title: t.communicationLogged });
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
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "reminders"] });
      const formattedDate = followUpDate ? format(new Date(`${followUpDate}T${followUpTime}:00`), "dd/MM/yyyy") : "";
      toast({ title: `تم جدولة المتابعة ليوم ${formattedDate}` });
      setFollowUpDate("");
      setFollowUpTime("09:00");
    },
    onError: () => {
      toast({ title: "فشل جدولة المتابعة", variant: "destructive" });
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: (data: { title: string; dueDate: string; leadId: string }) =>
      apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "reminders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t.reminderCompleted });
    },
  });

  const handleAISuggestReplies = async () => {
    if (!lead?.id) return;
    setAiRepliesLoading(true);
    setAiRepliesError(null);
    setAiReplies([]);
    try {
      const res = await apiRequest("POST", `/api/leads/${lead.id}/ai/suggest-replies`, {});
      const data = await res.json() as { replies?: string[]; error?: string };
      if (data.error) throw new Error(data.error);
      setAiReplies(data.replies ?? []);
    } catch (err) {
      setAiRepliesError(err instanceof Error ? err.message : "فشل في الحصول على اقتراحات");
    } finally {
      setAiRepliesLoading(false);
    }
  };

  const handleAIAnalyze = async () => {
    if (!lead?.id) return;
    setAiAnalysisLoading(true);
    setAiAnalysisError(null);
    setAiAnalysis(null);
    setAiAnalysisApplied(false);
    try {
      const res = await apiRequest("POST", `/api/leads/${lead.id}/ai/analyze`, {});
      const data = await res.json() as {
        budget?: string | null;
        unitType?: string | null;
        bedrooms?: number | null;
        interestLevel?: "hot" | "warm" | "cold" | null;
        summary?: string;
        error?: string;
      };
      if (data.error) throw new Error(data.error);
      setAiAnalysis({
        budget: data.budget ?? null,
        unitType: data.unitType ?? null,
        bedrooms: data.bedrooms ?? null,
        interestLevel: data.interestLevel ?? null,
        summary: data.summary ?? "",
      });
    } catch (err) {
      setAiAnalysisError(err instanceof Error ? err.message : "فشل في تحليل الليد");
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const handleApplyAIAnalysis = () => {
    if (!aiAnalysis || !lead) return;
    const updates: Partial<Lead> = {};
    if (aiAnalysis.budget) updates.budget = aiAnalysis.budget;
    if (aiAnalysis.unitType) updates.unitType = aiAnalysis.unitType;
    if (aiAnalysis.bedrooms) updates.bedrooms = aiAnalysis.bedrooms;
    if (aiAnalysis.interestLevel) updates.score = aiAnalysis.interestLevel;
    updates.aiAnalyzedAt = new Date();
    onUpdate(updates);
    setAiAnalysisApplied(true);
    toast({ title: "تم تطبيق تحليل الذكاء الاصطناعي على بيانات الليد" });
  };

  const handleCopyReply = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReplyIdx(idx);
      setTimeout(() => setCopiedReplyIdx(null), 2000);
    } catch {
      toast({ title: "تعذّر النسخ", variant: "destructive" });
    }
  };

  const handleAIEditReply = (text: string) => {
    setWaInjectMessage(text);
    toast({ title: "تم نقل الرد إلى صندوق الإرسال" });
  };

  const handleAISendReply = async (text: string, idx: number) => {
    if (!lead?.id || !lead.phone) {
      toast({ title: "لا يوجد رقم هاتف للليد", variant: "destructive" });
      return;
    }
    setAiSendingIdx(idx);
    try {
      const res = await apiRequest("POST", "/api/whatsapp/send", {
        leadId: lead.id,
        message: text,
      });
      const data = await res.json() as { error?: string };
      if (data.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "whatsapp-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "history"] });
      toast({ title: "تم إرسال الرد عبر واتساب" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "فشل الإرسال", variant: "destructive" });
    } finally {
      setAiSendingIdx(null);
    }
  };

  const handleSave = () => {
    onUpdate(formData);
    setEditMode(false);
    setFormData({});
  };

  const handleMarkAllRead = () => {
    unreadManagerComments.forEach(c => markReadMutation.mutate(c.id));
  };

  const handleLogCommunication = () => {
    if (!commType || !lead?.id) return;
    createCommunicationMutation.mutate({ type: commType, note: commNote || undefined });
  };

  const handleAddReminder = () => {
    if (!newReminderTitle || !newReminderDate || !lead?.id) return;
    createReminderMutation.mutate({ title: newReminderTitle, dueDate: newReminderDate, leadId: lead.id });
  };

  const getUnitDetails = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    const project = unit ? projects.find((p) => p.id === unit.projectId) : null;
    return { unit, project };
  };

  if (!lead) return null;

  const currentState = states.find((s) => s.id === lead.stateId);
  const sortedStates = [...states].sort((a, b) => a.order - b.order);
  const scoreInfo = computeLeadScore(lead);

  // Communication type config
  const commTypes = [
    { type: "call", icon: <PhoneCall className="h-3.5 w-3.5" />, label: t.commTypeCall, cls: "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400" },
    { type: "no_answer", icon: <PhoneMissed className="h-3.5 w-3.5" />, label: t.commTypeNoAnswer, cls: "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400" },
    { type: "whatsapp", icon: <MessageCircle className="h-3.5 w-3.5" />, label: t.commTypeWhatsapp, cls: "border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400" },
    { type: "meeting", icon: <Users className="h-3.5 w-3.5" />, label: t.commTypeMeeting, cls: "border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400" },
    { type: "note", icon: <FileText className="h-3.5 w-3.5" />, label: t.commTypeNote, cls: "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400" },
  ] as const;

  const commIconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    call: { icon: <PhoneCall className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-50 dark:bg-blue-950" },
    no_answer: { icon: <PhoneMissed className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-50 dark:bg-red-950" },
    whatsapp: { icon: <MessageCircle className="h-3.5 w-3.5" />, color: "text-green-500 bg-green-50 dark:bg-green-950" },
    meeting: { icon: <Users className="h-3.5 w-3.5" />, color: "text-purple-500 bg-purple-50 dark:bg-purple-950" },
    email: { icon: <Mail className="h-3.5 w-3.5" />, color: "text-orange-500 bg-orange-50 dark:bg-orange-950" },
    note: { icon: <FileText className="h-3.5 w-3.5" />, color: "text-gray-500 bg-gray-50 dark:bg-gray-900" },
  };

  const commTypeLabel: Record<string, string> = {
    call: t.commTypeCall,
    no_answer: t.commTypeNoAnswer,
    whatsapp: t.commTypeWhatsapp,
    meeting: t.commTypeMeeting,
    email: t.commTypeEmail,
    note: t.commTypeNote,
  };

  return (
    <>
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">

        {/* ── Header ── */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editMode ? (
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-xl font-bold h-9 mb-2"
                  data-testid="input-edit-name"
                />
              ) : (
                <SheetTitle className="text-xl leading-tight" data-testid="text-lead-detail-name">
                  {lead.name || "بدون اسم"}
                </SheetTitle>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {currentState && (
                  <Badge style={{ backgroundColor: currentState.color + "20", color: currentState.color, borderColor: currentState.color + "40" }}>
                    {currentState.name}
                  </Badge>
                )}
                <Badge className={`gap-1 border ${SCORE_COLORS[scoreInfo.score]}`} data-testid="badge-score-panel">
                  {scoreInfo.score === "hot" ? <Flame className="h-3 w-3" /> : scoreInfo.score === "warm" ? <Thermometer className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
                  {scoreInfo.score === "hot" ? t.scoreHot : scoreInfo.score === "warm" ? t.scoreWarm : t.scoreCold}
                </Badge>
                {lead.channel && <Badge variant="outline" className="text-xs">{lead.channel}</Badge>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end shrink-0">
              {canAutoAssign && !editMode && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => autoAssignMutation.mutate()} disabled={autoAssignMutation.isPending} data-testid="button-auto-assign">
                  <Shuffle className="h-3.5 w-3.5" />
                  {autoAssignMutation.isPending ? t.autoAssigning : t.autoAssign}
                </Button>
              )}
              {canTransfer && !editMode && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setShowTransferDialog(true)} data-testid="button-transfer-lead">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  {t.transferLead}
                </Button>
              )}
              {editMode ? (
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditMode(false); setFormData({}); }} data-testid="button-cancel-edit">
                    {t.cancel || "إلغاء"}
                  </Button>
                  <Button size="sm" className="h-8" onClick={handleSave} data-testid="button-save-lead">
                    {t.save || "حفظ"}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => { setFormData({ ...lead }); setEditMode(true); }} data-testid="button-edit-lead">
                  <Edit2 className="h-3.5 w-3.5" />
                  {t.edit || "تعديل"}
                </Button>
              )}
            </div>
          </div>

          {/* State progress bar */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {sortedStates.map((state, idx) => {
              const currentIdx = sortedStates.findIndex(s => s.id === lead.stateId);
              const isPast = idx < currentIdx;
              const isCurrent = state.id === lead.stateId;
              return (
                <button
                  key={state.id}
                  onClick={() => onUpdate({ stateId: state.id })}
                  title={state.name}
                  className={`h-1.5 flex-1 min-w-[20px] rounded-full transition-all hover:opacity-80 ${
                    isCurrent ? "opacity-100" : isPast ? "opacity-60" : "opacity-20"
                  }`}
                  style={{ backgroundColor: state.color }}
                  data-testid={`btn-state-${state.id}`}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t.currentStage || "المرحلة الحالية"}: <span className="font-medium">{currentState?.name || "—"}</span>
          </p>

          {/* Summary stats bar */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>آخر تواصل: <span className="font-medium text-foreground">{lastContactDate}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PhoneCall className="h-3.5 w-3.5" />
              <span>المكالمات: <span className="font-medium text-foreground">{totalCalls}</span></span>
            </div>
            {lead.budget && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{lead.budget}</span>
              </div>
            )}
          </div>
        </SheetHeader>

        {/* Agent banner: unread manager comments */}
        {isAssignedAgent && unreadManagerComments.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-2.5 mx-6 mt-3 text-sm" data-testid="banner-unread-manager-comment">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span>المانجر ترك ملاحظة على هذا الليد</span>
            </div>
            <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-7 text-xs" onClick={handleMarkAllRead} data-testid="button-mark-comment-read">
              تم الاطلاع
            </Button>
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-7 rounded-none border-b h-11 bg-transparent px-6 gap-0.5">
            <TabsTrigger value="overview" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-overview">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-communications">
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">التواصل</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-tasks">
              <ListTodo className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">التاسكس</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-reminders">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">التذكيرات</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-timeline">
              <Activity className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">السجل</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-units">
              <Home className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">الوحدات</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs gap-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none" data-testid="tab-lead-documents">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">المستندات</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-4">

              {/* ═══════════════ TAB: نظرة عامة ═══════════════ */}
              <TabsContent value="overview" className="m-0 space-y-4">

                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.contactInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {editMode ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.name || "الاسم"}</Label>
                          <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-edit-name-contact" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.phone || "الهاتف"}</Label>
                          <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="input-edit-phone" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.phone2 || "هاتف 2"}</Label>
                          <Input value={formData.phone2 || ""} onChange={(e) => setFormData({ ...formData, phone2: e.target.value })} data-testid="input-edit-phone2" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.email || "الإيميل"}</Label>
                          <Input value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-edit-email" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs">{t.location || "الموقع"}</Label>
                          <Input value={formData.location || ""} onChange={(e) => setFormData({ ...formData, location: e.target.value })} data-testid="input-edit-location" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.name || "—"}</span>
                          </div>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span dir="ltr">{lead.phone}</span>
                            </div>
                            <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50 text-xs" data-testid="button-whatsapp-primary">
                                <MessageCircle className="h-3.5 w-3.5" />
                                واتساب
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
                            <a href={`https://wa.me/${lead.phone2.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50 text-xs" data-testid="button-whatsapp-secondary">
                                <MessageCircle className="h-3.5 w-3.5" />
                                واتساب
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
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Property Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.propertyInfo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.unitType || "نوع الوحدة"}</Label>
                          <Input value={formData.unitType || ""} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} data-testid="input-edit-unittype" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.budget || "الميزانية"}</Label>
                          <Input value={formData.budget || ""} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} data-testid="input-edit-budget" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.bedrooms || "الغرف"}</Label>
                          <Input value={formData.bedrooms || ""} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} data-testid="input-edit-bedrooms" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.space || "المساحة"}</Label>
                          <Input value={formData.space || ""} onChange={(e) => setFormData({ ...formData, space: e.target.value })} data-testid="input-edit-space" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.area || "المنطقة"}</Label>
                          <Input value={formData.area || ""} onChange={(e) => setFormData({ ...formData, area: e.target.value })} data-testid="input-edit-area" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.paymentType || "طريقة الدفع"}</Label>
                          <Input value={formData.paymentType || ""} onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })} data-testid="input-edit-paymenttype" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          { label: t.unitType || "نوع الوحدة", value: lead.unitType, icon: <Building2 className="h-3.5 w-3.5" /> },
                          { label: t.budget || "الميزانية", value: lead.budget, icon: <DollarSign className="h-3.5 w-3.5" /> },
                          { label: t.bedrooms || "الغرف", value: lead.bedrooms },
                          { label: `${t.space || "المساحة"} (م²)`, value: lead.space },
                          { label: t.area || "المنطقة", value: lead.area },
                          { label: t.paymentType || "طريقة الدفع", value: lead.paymentType },
                        ].map(({ label, value, icon }) => (
                          <div key={label}>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
                            <p className="font-medium mt-0.5">{value || "—"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.additionalInfo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.channel || "المصدر"}</Label>
                          <Input value={formData.channel || ""} onChange={(e) => setFormData({ ...formData, channel: e.target.value })} data-testid="input-edit-channel" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t.campaign || "الحملة"}</Label>
                          <Input value={formData.campaign || ""} onChange={(e) => setFormData({ ...formData, campaign: e.target.value })} data-testid="input-edit-campaign" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs">{t.status || "الحالة"}</Label>
                          <Select value={formData.stateId || ""} onValueChange={(v) => setFormData({ ...formData, stateId: v })}>
                            <SelectTrigger data-testid="select-edit-state">
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                              {states.map((state) => (
                                <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-xs">{t.notes || "ملاحظات"}</Label>
                          <Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} data-testid="textarea-edit-notes" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {lead.channel && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t.channel || "المصدر"}</p>
                              <Badge variant="outline" className="mt-0.5 text-xs">{lead.channel}</Badge>
                            </div>
                          )}
                          {lead.campaign && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t.campaign || "الحملة"}</p>
                              <p className="font-medium mt-0.5">{lead.campaign}</p>
                            </div>
                          )}
                          {lead.campaignName && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t.campaignName || "اسم الحملة"}</p>
                              <p className="font-medium mt-0.5">{lead.campaignName}</p>
                            </div>
                          )}
                          {lead.requestType && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t.requestType || "نوع الطلب"}</p>
                              <p className="font-medium mt-0.5">{lead.requestType}</p>
                            </div>
                          )}
                          {lead.marketingCost && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t.marketingCost || "تكلفة التسويق"}</p>
                              <p className="font-medium mt-0.5">{Number(lead.marketingCost).toLocaleString()} {t.currency || "ج.م"}</p>
                            </div>
                          )}
                          {lead.createdAt && (
                            <div>
                              <p className="text-xs text-muted-foreground">{t.createdAt || "تاريخ الإنشاء"}</p>
                              <p className="font-medium mt-0.5">{format(new Date(lead.createdAt), "dd/MM/yyyy")}</p>
                            </div>
                          )}
                        </div>
                        {lead.notes && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">{t.notes || "ملاحظات"}</p>
                            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Tasks Preview */}
                {tasks && tasks.filter(t => !t.completed).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ListTodo className="h-4 w-4" />
                        {t.tasks || "المهام المعلقة"}
                        <Badge variant="secondary" className="text-xs">{tasks.filter(tt => !tt.completed).length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tasks.filter(tt => !tt.completed).slice(0, 3).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleTaskMutation.mutate({ taskId: task.id, completed: true })} data-testid={`button-toggle-overview-task-${task.id}`}>
                              <Clock className="h-4 w-4 text-muted-foreground hover:text-green-500 transition-colors" />
                            </button>
                            <span>{task.title}</span>
                            {task.type && <Badge variant="outline" className="text-xs h-4">{task.type}</Badge>}
                          </div>
                          {(task as any).dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date((task as any).dueDate), "dd/MM")}
                            </span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ═══════════════ TAB: سجل التواصل ═══════════════ */}
              <TabsContent value="communications" className="m-0 space-y-4">

                {/* Quick actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.logCommunication || "تسجيل تواصل"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Quick type buttons */}
                    <div className="flex flex-wrap gap-2">
                      {commTypes.map(({ type, icon, label, cls }) => (
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

                    {/* Detailed log form */}
                    <div className="flex gap-2">
                      <Select value={commType} onValueChange={setCommType}>
                        <SelectTrigger className="flex-1" data-testid="select-comm-type">
                          <SelectValue placeholder={t.selectCommType || "اختر نوع التواصل"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call"><div className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-blue-500" />{t.commTypeCall}</div></SelectItem>
                          <SelectItem value="no_answer"><div className="flex items-center gap-2"><PhoneMissed className="h-4 w-4 text-red-500" />{t.commTypeNoAnswer}</div></SelectItem>
                          <SelectItem value="whatsapp"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-500" />{t.commTypeWhatsapp}</div></SelectItem>
                          <SelectItem value="meeting"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" />{t.commTypeMeeting}</div></SelectItem>
                          <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-orange-500" />{t.commTypeEmail}</div></SelectItem>
                          <SelectItem value="note"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-500" />{t.commTypeNote}</div></SelectItem>
                        </SelectContent>
                      </Select>
                      {lead.phone && commType === "whatsapp" && (
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 shrink-0" data-testid="button-open-whatsapp">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {t.whatsappChat || "محادثة"}
                          </Button>
                        </a>
                      )}
                    </div>
                    <Textarea
                      placeholder={t.communicationNote || "ملاحظة (اختياري)"}
                      value={commNote}
                      onChange={(e) => setCommNote(e.target.value)}
                      className="min-h-[60px] resize-none"
                      data-testid="input-comm-note"
                    />
                    <Button onClick={handleLogCommunication} disabled={!commType || createCommunicationMutation.isPending} className="w-full" data-testid="button-log-communication">
                      <Plus className="h-4 w-4 mr-1" />
                      {t.logComm || "سجّل التواصل"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Call log with follow-up */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        اتصل الآن
                      </CardTitle>
                      {lead.phone && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowLogCallForm(!showLogCallForm)} data-testid="button-toggle-log-call">
                          <ClipboardList className="h-3.5 w-3.5 mr-1" />
                          سجّل مكالمة
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lead.phone ? (
                      <Button variant="outline" className="w-full justify-start h-10 text-sm" asChild>
                        <a href={`tel:${lead.phone}`} data-testid="button-call-phone">
                          <PhoneCall className="h-4 w-4 mr-2 text-green-600" />
                          {lead.phone}
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">لا يوجد رقم هاتف</p>
                    )}
                    {showLogCallForm && (
                      <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">نتيجة المكالمة</label>
                          <Select value={callOutcome} onValueChange={setCallOutcome}>
                            <SelectTrigger data-testid="select-call-outcome"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(CALL_OUTCOME_LABELS).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea value={callNote} onChange={(e) => setCallNote(e.target.value)} placeholder="ملاحظات عن المكالمة..." rows={2} className="resize-none text-sm" data-testid="textarea-call-note" />
                        <Button className="w-full" onClick={() => logCallMutation.mutate()} disabled={logCallMutation.isPending} data-testid="button-save-call-log">
                          {logCallMutation.isPending ? "جاري الحفظ..." : "حفظ المكالمة"}
                        </Button>
                      </div>
                    )}

                    {/* Schedule follow-up */}
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">جدولة متابعة</p>
                      <div className="flex gap-2">
                        <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="flex-1 h-8 text-sm" data-testid="input-followup-date" />
                        <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className="w-24 h-8 text-sm" data-testid="input-followup-time" />
                        <Button size="sm" className="h-8 shrink-0" onClick={() => createFollowUpMutation.mutate()} disabled={!followUpDate || createFollowUpMutation.isPending} data-testid="button-schedule-followup">
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Panel */}
                {lead.phone && (
                  <WhatsAppPanel
                    lead={lead}
                    agentName={currentUser?.username}
                    injectMessage={waInjectMessage}
                    onInjectConsumed={() => setWaInjectMessage(undefined)}
                  />
                )}

                {/* AI Assistant Panel */}
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-purple-700 dark:text-purple-400">
                        <Sparkles className="h-4 w-4" />
                        مساعد الذكاء الاصطناعي
                      </CardTitle>
                      {(aiAnalysisApplied || !!lead?.aiAnalyzedAt) && (
                        <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300" data-testid="badge-ai-analyzed">
                          <CheckCheck className="h-3 w-3 mr-1" />
                          تم التحليل بالـ AI
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* Section 1: Suggest Replies */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          اقتراح ردود واتساب
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                          onClick={handleAISuggestReplies}
                          disabled={aiRepliesLoading}
                          data-testid="button-ai-suggest-replies"
                        >
                          {aiRepliesLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              جاري التوليد...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              اقترح رداً
                            </>
                          )}
                        </Button>
                      </div>

                      {aiRepliesError && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950 rounded p-2" data-testid="text-ai-replies-error">{aiRepliesError}</p>
                      )}

                      {aiReplies.length > 0 && (
                        <div className="space-y-2" data-testid="container-ai-replies">
                          {aiReplies.map((reply, idx) => (
                            <div key={idx} className="rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 p-2.5 space-y-2">
                              <p className="text-sm leading-relaxed text-right" data-testid={`text-ai-reply-${idx}`}>{reply}</p>
                              <div className="flex gap-1.5 justify-end flex-wrap">
                                {/* Send directly via WhatsApp */}
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-6 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleAISendReply(reply, idx)}
                                  disabled={aiSendingIdx === idx || !lead.phone}
                                  data-testid={`button-ai-send-reply-${idx}`}
                                >
                                  {aiSendingIdx === idx ? (
                                    <><Loader2 className="h-3 w-3 animate-spin" />جاري الإرسال</>
                                  ) : (
                                    <><Send className="h-3 w-3" />إرسال</>
                                  )}
                                </Button>
                                {/* Edit: inject into WhatsApp textarea */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400"
                                  onClick={() => handleAIEditReply(reply)}
                                  data-testid={`button-ai-edit-reply-${idx}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                  تعديل
                                </Button>
                                {/* Copy to clipboard */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleCopyReply(reply, idx)}
                                  data-testid={`button-ai-copy-reply-${idx}`}
                                >
                                  {copiedReplyIdx === idx ? (
                                    <><CheckCheck className="h-3 w-3 text-green-500" />نُسخ</>
                                  ) : (
                                    <><Copy className="h-3 w-3" />نسخ</>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t" />

                    {/* Section 2: Analyze Lead */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Brain className="h-3.5 w-3.5" />
                          تحليل الليد
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                          onClick={handleAIAnalyze}
                          disabled={aiAnalysisLoading}
                          data-testid="button-ai-analyze"
                        >
                          {aiAnalysisLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              جاري التحليل...
                            </>
                          ) : (
                            <>
                              <Brain className="h-3 w-3 mr-1" />
                              حلّل المحادثة
                            </>
                          )}
                        </Button>
                      </div>

                      {aiAnalysisError && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950 rounded p-2" data-testid="text-ai-analysis-error">{aiAnalysisError}</p>
                      )}

                      {aiAnalysis && (
                        <div className="rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 p-3 space-y-3" data-testid="container-ai-analysis">
                          <p className="text-sm leading-relaxed text-right text-muted-foreground" data-testid="text-ai-summary">{aiAnalysis.summary}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {aiAnalysis.interestLevel && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">مستوى الاهتمام</span>
                                <Badge
                                  className={`text-xs w-fit ${
                                    aiAnalysis.interestLevel === "hot"
                                      ? "bg-red-100 text-red-700 border-red-200"
                                      : aiAnalysis.interestLevel === "warm"
                                      ? "bg-orange-100 text-orange-700 border-orange-200"
                                      : "bg-blue-100 text-blue-700 border-blue-200"
                                  }`}
                                  data-testid="badge-ai-interest"
                                >
                                  {aiAnalysis.interestLevel === "hot" ? "🔥 ساخن" : aiAnalysis.interestLevel === "warm" ? "⚡ دافئ" : "❄️ بارد"}
                                </Badge>
                              </div>
                            )}
                            {aiAnalysis.budget && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">الميزانية</span>
                                <span className="text-xs font-medium" data-testid="text-ai-budget">{aiAnalysis.budget}</span>
                              </div>
                            )}
                            {aiAnalysis.unitType && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">نوع الوحدة</span>
                                <span className="text-xs font-medium" data-testid="text-ai-unittype">{aiAnalysis.unitType}</span>
                              </div>
                            )}
                            {aiAnalysis.bedrooms && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">عدد الغرف</span>
                                <span className="text-xs font-medium" data-testid="text-ai-bedrooms">{aiAnalysis.bedrooms} غرف</span>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={handleApplyAIAnalysis}
                            disabled={aiAnalysisApplied}
                            data-testid="button-ai-apply-analysis"
                          >
                            {aiAnalysisApplied ? (
                              <><CheckCheck className="h-3 w-3 mr-1" />تم التطبيق</>
                            ) : (
                              <><CheckCheck className="h-3 w-3 mr-1" />تطبيق على بيانات الليد</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                  </CardContent>
                </Card>

                {/* Communications timeline */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">سجل التواصل</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {communications.length > 0 ? (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-border rtl:left-auto rtl:right-4" />
                        <div className="space-y-3">
                          {[...communications].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map((comm) => {
                            const typeInfo = commIconMap[comm.type] || commIconMap.note;
                            return (
                              <div key={comm.id} className="relative pl-10 rtl:pl-0 rtl:pr-10">
                                <div className={`absolute left-2 top-2 w-5 h-5 rounded-full flex items-center justify-center rtl:left-auto rtl:right-2 ${typeInfo.color}`}>
                                  {typeInfo.icon}
                                </div>
                                <div className="p-3 rounded-md border">
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>
                                      {commTypeLabel[comm.type] || comm.type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {comm.createdAt && format(new Date(comm.createdAt), "dd/MM, HH:mm")}
                                    </span>
                                  </div>
                                  {comm.note && <p className="text-sm text-muted-foreground mt-1">{comm.note}</p>}
                                  {comm.userName && <p className="text-xs text-muted-foreground mt-1">بواسطة: {comm.userName}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
                        {t.noCommunications || "لا يوجد سجل تواصل بعد"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══════════════ TAB: التاسكس ═══════════════ */}
              <TabsContent value="tasks" className="m-0 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">إضافة تاسك جديد</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input placeholder="عنوان التاسك (مثال: إرسال عرض السعر)" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} data-testid="input-new-task-title" />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v })}>
                        <SelectTrigger data-testid="select-new-task-type">
                          <SelectValue placeholder="نوع التاسك" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="اتصال">📞 اتصال</SelectItem>
                          <SelectItem value="ميتنج">🤝 ميتنج</SelectItem>
                          <SelectItem value="معاينة موقع">🏗️ معاينة موقع</SelectItem>
                          <SelectItem value="إرسال عرض سعر">📄 إرسال عرض سعر</SelectItem>
                          <SelectItem value="تحضير عقد">📝 تحضير عقد</SelectItem>
                          <SelectItem value="متابعة">🔔 متابعة</SelectItem>
                          <SelectItem value="واتساب">💬 واتساب</SelectItem>
                          <SelectItem value="أخرى">📌 أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} data-testid="input-new-task-due-date" />
                    </div>
                    <Textarea placeholder="ملاحظات (اختياري)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2} data-testid="textarea-new-task-description" />
                    <Button className="w-full" onClick={() => createTaskMutation.mutate(newTask)} disabled={!newTask.title || createTaskMutation.isPending} data-testid="button-add-task">
                      <Plus className="h-4 w-4 mr-2" />
                      {createTaskMutation.isPending ? "جاري الإضافة..." : "أضف التاسك"}
                    </Button>
                  </CardContent>
                </Card>

                {tasksLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-48" /></CardContent></Card>
                    ))}
                  </div>
                ) : tasks && tasks.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <Card key={task.id} className={task.completed ? "opacity-50" : ""} data-testid={`card-task-${task.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button onClick={() => toggleTaskMutation.mutate({ taskId: task.id, completed: !task.completed })} className="mt-0.5 shrink-0" data-testid={`button-toggle-task-${task.id}`}>
                                {task.completed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {task.type && <Badge variant="outline" className="text-xs">{task.type}</Badge>}
                                  {(task as any).dueDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date((task as any).dueDate), "dd/MM/yyyy")}</span>}
                                  {task.completed && <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950">منجز ✓</Badge>}
                                </div>
                                {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteTaskMutation.mutate(task.id)} data-testid={`button-delete-task-${task.id}`}>
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
                      <p className="text-muted-foreground text-sm">مفيش تاسكس لسه</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ═══════════════ TAB: التذكيرات ═══════════════ */}
              <TabsContent value="reminders" className="m-0 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.addReminder || "إضافة تذكير"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Input placeholder={t.reminderTitle || "عنوان التذكير"} value={newReminderTitle} onChange={(e) => setNewReminderTitle(e.target.value)} className="flex-1 min-w-[150px]" data-testid="input-reminder-title" />
                      <Input type="datetime-local" value={newReminderDate} onChange={(e) => setNewReminderDate(e.target.value)} className="w-48" data-testid="input-reminder-date" />
                      <Button onClick={handleAddReminder} disabled={!newReminderTitle || !newReminderDate} data-testid="button-add-reminder">
                        <Plus className="h-4 w-4 mr-1" />
                        {t.addReminder || "إضافة"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    {reminders.length > 0 ? (
                      <div className="space-y-2">
                        {reminders.map((reminder) => (
                          <div key={reminder.id} className={`flex items-center justify-between p-3 rounded-md border ${reminder.isCompleted ? "opacity-50" : ""}`} data-testid={`reminder-${reminder.id}`}>
                            <div className="flex items-center gap-3">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => completeReminderMutation.mutate(reminder.id)} disabled={reminder.isCompleted ?? false}>
                                <CheckCircle className={`h-5 w-5 ${reminder.isCompleted ? "text-green-500" : "text-muted-foreground"}`} />
                              </Button>
                              <div>
                                <p className={reminder.isCompleted ? "line-through text-sm" : "font-medium text-sm"}>{reminder.title}</p>
                                <p className="text-xs text-muted-foreground">{reminder.dueDate && format(new Date(reminder.dueDate), "dd/MM/yyyy, HH:mm")}</p>
                              </div>
                            </div>
                            <Badge variant={reminder.isCompleted ? "secondary" : "default"} className="text-xs">{reminder.priority || "متوسط"}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">{t.noReminders || "لا يوجد تذكيرات"}</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══════════════ TAB: السجل / Timeline ═══════════════ */}
              <TabsContent value="timeline" className="m-0 space-y-4">
                {/* Manager Note button */}
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
                          <Textarea placeholder="اكتب ملاحظتك التدريبية هنا..." value={managerNoteContent} onChange={(e) => setManagerNoteContent(e.target.value)} rows={3} data-testid="textarea-manager-note" className="border-amber-200 focus:border-amber-400" />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setShowManagerNoteInput(false); setManagerNoteContent(""); }} data-testid="button-cancel-manager-note">إلغاء</Button>
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => managerNoteContent.trim() && createManagerCommentMutation.mutate(managerNoteContent.trim())} disabled={!managerNoteContent.trim() || createManagerCommentMutation.isPending} data-testid="button-submit-manager-note">إرسال الملاحظة</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 w-full" onClick={() => setShowManagerNoteInput(true)} data-testid="button-add-manager-note">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        إضافة ملاحظة المانجر
                      </Button>
                    )}
                  </div>
                )}

                {/* Merged timeline: history + manager comments + communications */}
                {(historyLoading || commentsLoading) ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-4 w-48" /></CardContent></Card>)}</div>
                ) : (() => {
                  const historyItems = (history ?? []).map(item => ({ type: "history" as const, id: item.id, createdAt: item.createdAt, data: item }));
                  const commentItems = (managerComments ?? []).map(c => ({ type: "manager_comment" as const, id: c.id, createdAt: c.createdAt, data: c }));
                  const commItems = communications.map(c => ({ type: "communication" as const, id: c.id, createdAt: c.createdAt, data: c }));
                  const allItems = [...historyItems, ...commentItems, ...commItems].sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                  });

                  if (allItems.length === 0) {
                    return (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
                          <p className="text-muted-foreground text-sm">لا يوجد سجل بعد</p>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border rtl:left-auto rtl:right-4" />
                      <div className="space-y-3">
                        {allItems.map((item) => {
                          if (item.type === "manager_comment") {
                            const comment = item.data as LeadManagerComment;
                            const isMyComment = currentUser?.id === comment.managerId;
                            const isBeingEdited = editingCommentId === comment.id;
                            return (
                              <div key={`mc-${comment.id}`} className="relative pl-10 rtl:pl-0 rtl:pr-10" data-testid={`manager-comment-${comment.id}`}>
                                <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-amber-500 rtl:left-auto rtl:right-2.5" />
                                <Card className="border-l-4 border-l-amber-400 dark:border-l-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">ملاحظة المانجر</span>
                                        {!comment.isReadByAgent && isAssignedAgent && <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0">جديد</Badge>}
                                        {comment.isReadByAgent && isManager && <Badge variant="outline" className="text-xs px-1.5 py-0 border-green-400 text-green-600"><Check className="h-3 w-3 mr-1" />تمت القراءة</Badge>}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">{comment.createdAt ? format(new Date(comment.createdAt), "dd/MM HH:mm") : ""}</span>
                                        {isMyComment && !isBeingEdited && (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }} data-testid={`button-edit-manager-comment-${comment.id}`}><Edit2 className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => deleteManagerCommentMutation.mutate(comment.id)} data-testid={`button-delete-manager-comment-${comment.id}`}><Trash2 className="h-3 w-3" /></Button>
                                          </>
                                        )}
                                        {isBeingEdited && (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={() => editManagerCommentMutation.mutate({ id: comment.id, content: editingCommentContent })} disabled={!editingCommentContent.trim()} data-testid={`button-save-manager-comment-${comment.id}`}><Check className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCommentId(null); setEditingCommentContent(""); }} data-testid={`button-cancel-edit-manager-comment-${comment.id}`}><X className="h-3 w-3" /></Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {isBeingEdited ? (
                                      <Textarea value={editingCommentContent} onChange={(e) => setEditingCommentContent(e.target.value)} rows={3} className="mt-2 border-amber-200 focus:border-amber-400" data-testid={`textarea-edit-manager-comment-${comment.id}`} />
                                    ) : (
                                      <p className="text-sm mt-2 whitespace-pre-wrap">{comment.content}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">{comment.managerName}</p>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          }

                          if (item.type === "communication") {
                            const comm = item.data as Communication;
                            const typeInfo = commIconMap[comm.type] || commIconMap.note;
                            return (
                              <div key={`comm-${comm.id}`} className="relative pl-10 rtl:pl-0 rtl:pr-10">
                                <div className={`absolute left-2 top-2 w-4 h-4 rounded-full flex items-center justify-center rtl:left-auto rtl:right-2 ${typeInfo.color}`}>{typeInfo.icon}</div>
                                <div className="p-3 rounded-md border text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>{commTypeLabel[comm.type] || comm.type}</Badge>
                                    <span className="text-xs text-muted-foreground">{comm.createdAt && format(new Date(comm.createdAt), "dd/MM, HH:mm")}</span>
                                  </div>
                                  {comm.note && <p className="text-muted-foreground mt-1">{comm.note}</p>}
                                  {comm.userName && <p className="text-xs text-muted-foreground mt-1">بواسطة: {comm.userName}</p>}
                                </div>
                              </div>
                            );
                          }

                          const historyItem = item.data as LeadHistory;
                          return (
                            <div key={`h-${historyItem.id}`} className="relative pl-10 rtl:pl-0 rtl:pr-10">
                              <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-primary rtl:left-auto rtl:right-2.5" />
                              <div className="p-3 rounded-md border text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium">{historyItem.action}</p>
                                  <span className="text-xs text-muted-foreground">{historyItem.createdAt ? format(new Date(historyItem.createdAt), "dd/MM, HH:mm") : ""}</span>
                                </div>
                                {historyItem.description && <p className="text-muted-foreground mt-1">{historyItem.description}</p>}
                                {historyItem.performedBy && <p className="text-xs text-muted-foreground mt-1">بواسطة {historyItem.performedBy}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* ═══════════════ TAB: الوحدات المهتم بها ═══════════════ */}
              <TabsContent value="units" className="m-0">
                <Card>
                  <CardContent className="pt-4">
                    {interests.length > 0 ? (
                      <>
                        {compareUnitIds.size >= 2 && (
                          <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg" data-testid="lead-compare-bar">
                            <span className="text-sm font-medium text-primary">{compareUnitIds.size} {t.unitsSelected || "وحدات"}</span>
                            <Button size="sm" onClick={() => setIsCompareOpen(true)} className="gap-2" data-testid="button-lead-compare-units">
                              <GitCompare className="h-4 w-4" />
                              {t.compareUnits || "مقارنة"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCompareUnitIds(new Set())} data-testid="button-lead-clear-compare">{t.clearSelection || "مسح"}</Button>
                          </div>
                        )}
                        <div className="space-y-3">
                          {interests.map((interest) => {
                            const { unit, project } = getUnitDetails(interest.unitId);
                            if (!unit) return null;
                            const isSelected = compareUnitIds.has(unit.id);
                            return (
                              <div key={interest.id} className={`flex items-center justify-between p-3 rounded-md border ${isSelected ? "border-primary/40 bg-primary/5" : ""}`} data-testid={`unit-interest-${interest.id}`}>
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={isSelected} onChange={() => { setCompareUnitIds((prev) => { const next = new Set(prev); if (next.has(unit.id)) next.delete(unit.id); else if (next.size < 4) next.add(unit.id); return next; }); }} disabled={!isSelected && compareUnitIds.size >= 4} className="w-4 h-4 accent-primary cursor-pointer" data-testid={`checkbox-interest-${interest.id}`} />
                                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                                    <Home className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{project?.name || "—"}</p>
                                    <p className="text-xs text-muted-foreground">{t.unit || "وحدة"} {unit.unitNumber} - {unit.area}م² - {unit.bedrooms} {t.bedrooms || "غرف"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-end">
                                    <p className="font-bold text-sm">{unit.price?.toLocaleString()} {t.currency || "ج.م"}</p>
                                    <Badge variant={interest.interestLevel === "high" ? "default" : "secondary"} className="text-xs">{interest.interestLevel}</Badge>
                                  </div>
                                  <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => setCalcUnitId(unit.id)} data-testid={`button-calc-interest-${interest.id}`}>
                                    <Calculator className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">{t.noDataToDisplay || "لا يوجد وحدات مهتم بها"}</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ═══════════════ TAB: المستندات ═══════════════ */}
              <TabsContent value="documents" className="m-0">
                <DocumentsTab entityType="lead" entityId={lead.id} />
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>

    {/* Transfer Dialog */}
    <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.transferLead || "تحويل الليد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Select value={transferToUserId} onValueChange={setTransferToUserId}>
            <SelectTrigger data-testid="select-transfer-agent">
              <SelectValue placeholder="اختر المندوب" />
            </SelectTrigger>
            <SelectContent>
              {(salesAgents || []).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.fullName || agent.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTransferDialog(false)}>{t.cancel || "إلغاء"}</Button>
          <Button onClick={() => lead && transferToUserId && transferMutation.mutate({ leadId: lead.id, toUserId: transferToUserId })} disabled={!transferToUserId || transferMutation.isPending} data-testid="button-confirm-transfer">
            {transferMutation.isPending ? "جاري التحويل..." : t.transferLead || "تحويل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Installment Calculator */}
    {calcUnitId && (() => {
      const { unit, project } = getUnitDetails(calcUnitId);
      return unit ? (
        <InstallmentCalculator unit={unit} projectName={project?.name} isOpen={!!calcUnitId} onClose={() => setCalcUnitId(null)} />
      ) : null;
    })()}

    {/* Unit Compare */}
    {isCompareOpen && compareUnitIds.size >= 2 && (() => {
      const compareUnits = units.filter((u) => compareUnitIds.has(u.id));
      return (
        <UnitCompare units={compareUnits} projects={projects} isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />
      );
    })()}
    </>
  );
}