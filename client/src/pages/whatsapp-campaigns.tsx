import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Megaphone,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Search,
  RefreshCw,
  Bell,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  message: string;
  filterStateId: string | null;
  filterChannel: string | null;
  filterDaysNoReply: number | null;
  scheduledAt: string | null;
  status: string;
  createdBy: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

interface FollowupRule {
  id: string;
  name: string;
  message: string;
  daysAfterNoReply: number;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

interface LeadState {
  id: string;
  name: string;
  color: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-gray-100 text-gray-600" },
  scheduled: { label: "مجدولة", color: "bg-blue-100 text-blue-700" },
  running: { label: "جارية", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "مكتملة", color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغاة", color: "bg-red-100 text-red-700" },
};

const CHANNELS = ["فيسبوك", "إنستجرام", "جوجل", "موقع إلكتروني", "توصية", "مكالمة واردة", "واتساب", "تيك توك", "يوتيوب"];

function CampaignStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {status === "running" && <RefreshCw className="h-3 w-3 animate-spin" />}
      {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
      {status === "scheduled" && <Clock className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

function CreateCampaignDialog({ states }: { states: LeadState[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    message: "",
    filterStateId: "",
    filterChannel: "",
    filterDaysNoReply: "",
    scheduledAt: "",
  });
  const [preview, setPreview] = useState<{ count: number; leads: { id: string; name: string | null; phone: string | null }[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const previewMutation = useMutation({
    mutationFn: async () => {
      setPreviewing(true);
      const res = await apiRequest("POST", "/api/campaigns/preview", {
        filterStateId: form.filterStateId || undefined,
        filterChannel: form.filterChannel || undefined,
        filterDaysNoReply: form.filterDaysNoReply ? Number(form.filterDaysNoReply) : undefined,
      });
      return res.json() as Promise<{ count: number; leads: { id: string; name: string | null; phone: string | null }[] }>;
    },
    onSuccess: (data) => { setPreview(data); setPreviewing(false); },
    onError: () => { setPreviewing(false); toast({ title: "فشل في المعاينة", variant: "destructive" }); },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: form.name,
        message: form.message,
      };
      if (form.filterStateId) body.filterStateId = form.filterStateId;
      if (form.filterChannel) body.filterChannel = form.filterChannel;
      if (form.filterDaysNoReply) body.filterDaysNoReply = Number(form.filterDaysNoReply);
      if (form.scheduledAt) body.scheduledAt = new Date(form.scheduledAt).toISOString();
      const res = await apiRequest("POST", "/api/campaigns", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "تم إنشاء الحملة بنجاح ✅" });
      setOpen(false);
      setForm({ name: "", message: "", filterStateId: "", filterChannel: "", filterDaysNoReply: "", scheduledAt: "" });
      setPreview(null);
    },
    onError: () => { toast({ title: "فشل في إنشاء الحملة", variant: "destructive" }); },
  });

  const canCreate = form.name.trim() && form.message.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-campaign">
          <Plus className="h-4 w-4 ml-2" />
          حملة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء حملة واتساب جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="camp-name">اسم الحملة</Label>
            <Input
              id="camp-name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: متابعة ليدز مارس"
              data-testid="input-campaign-name"
            />
          </div>

          <div className="space-y-2">
            <Label>نص الرسالة</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="أهلاً {اسم العميل}، نتمنى أن تكون بخير..."
              rows={4}
              data-testid="input-campaign-message"
            />
            <p className="text-xs text-muted-foreground">{form.message.length} حرف</p>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">فلتر الليدز (اختياري)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={form.filterStateId} onValueChange={v => setForm(f => ({ ...f, filterStateId: v === "__all__" ? "" : v }))}>
                  <SelectTrigger data-testid="select-filter-state">
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل الحالات</SelectItem>
                    {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">القناة</Label>
                <Select value={form.filterChannel} onValueChange={v => setForm(f => ({ ...f, filterChannel: v === "__all__" ? "" : v }))}>
                  <SelectTrigger data-testid="select-filter-channel">
                    <SelectValue placeholder="كل القنوات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل القنوات</SelectItem>
                    {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">أيام بدون رد</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.filterDaysNoReply}
                  onChange={e => setForm(f => ({ ...f, filterDaysNoReply: e.target.value }))}
                  placeholder="مثال: 7"
                  data-testid="input-filter-days"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewMutation.mutate()}
                disabled={previewing}
                data-testid="button-preview-campaign"
              >
                <Search className="h-3 w-3 ml-1" />
                {previewing ? "جاري المعاينة..." : "معاينة الليدز"}
              </Button>
              {preview !== null && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{preview.count} ليد</span>
                  {preview.count === 0 && <span className="text-xs text-muted-foreground">لا يوجد ليدز بهذا الفلتر</span>}
                  {preview.leads.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      (مثال: {preview.leads.slice(0, 2).map(l => l.name || l.phone || "—").join("، ")}{preview.count > 2 ? "..." : ""})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="camp-scheduled">وقت الإرسال (اتركه فارغاً للإرسال الآن)</Label>
            <Input
              id="camp-scheduled"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              data-testid="input-campaign-schedule"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canCreate || createMutation.isPending}
              data-testid="button-submit-campaign"
            >
              <Play className="h-4 w-4 ml-2" />
              {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء وجدولة"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateFollowupRuleDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", message: "", daysAfterNoReply: "3" });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/followup-rules", {
        name: form.name,
        message: form.message,
        daysAfterNoReply: Number(form.daysAfterNoReply),
        isActive: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followup-rules"] });
      toast({ title: "تم إنشاء قاعدة المتابعة ✅" });
      setOpen(false);
      setForm({ name: "", message: "", daysAfterNoReply: "3" });
    },
    onError: () => { toast({ title: "فشل في إنشاء القاعدة", variant: "destructive" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-create-followup-rule">
          <Plus className="h-4 w-4 ml-2" />
          قاعدة متابعة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء قاعدة متابعة تلقائية</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>اسم القاعدة</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: متابعة بعد 3 أيام"
              data-testid="input-rule-name"
            />
          </div>
          <div className="space-y-2">
            <Label>أيام بدون رد</Label>
            <Input
              type="number"
              min={1}
              value={form.daysAfterNoReply}
              onChange={e => setForm(f => ({ ...f, daysAfterNoReply: e.target.value }))}
              data-testid="input-rule-days"
            />
            <p className="text-xs text-muted-foreground">الرسالة ستُرسل لكل ليد لم يرد منذ {form.daysAfterNoReply} أيام</p>
          </div>
          <div className="space-y-2">
            <Label>نص رسالة المتابعة</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="أهلاً، نتمنى أن تكون بخير. كنا نود معرفة إذا كنت لا تزال مهتماً..."
              rows={4}
              data-testid="input-rule-message"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || !form.message.trim() || createMutation.isPending}
              data-testid="button-submit-rule"
            >
              {createMutation.isPending ? "جاري الحفظ..." : "حفظ القاعدة"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WhatsAppCampaignsPage() {
  const { toast } = useToast();

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    refetchInterval: 15000,
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<FollowupRule[]>({
    queryKey: ["/api/followup-rules"],
    refetchInterval: 30000,
  });

  const { data: states = [] } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/campaigns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "تم حذف الحملة" });
    },
    onError: (err: Error) => {
      toast({ title: err.message || "فشل في حذف الحملة", variant: "destructive" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/followup-rules/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followup-rules"] });
    },
    onError: () => { toast({ title: "فشل في تحديث القاعدة", variant: "destructive" }); },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/followup-rules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followup-rules"] });
      toast({ title: "تم حذف القاعدة" });
    },
    onError: () => { toast({ title: "فشل في حذف القاعدة", variant: "destructive" }); },
  });

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getStateName = (stateId: string | null) => {
    if (!stateId) return null;
    return states.find(s => s.id === stateId)?.name ?? stateId;
  };

  return (
    <div className="space-y-6 max-w-5xl" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-campaigns-title">
            حملات الواتساب
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">إرسال رسائل جماعية ومتابعة تلقائية لليدز</p>
        </div>
        <CreateCampaignDialog states={states} />
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">الحملات</CardTitle>
            <Badge variant="secondary">{campaigns.length}</Badge>
          </div>
          <CardDescription>الحملات المجدولة والمكتملة</CardDescription>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد حملات بعد</p>
              <p className="text-xs mt-1">اضغط على "حملة جديدة" لإنشاء أول حملة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className="rounded-lg border p-4 hover:bg-accent/30 transition-colors"
                  data-testid={`card-campaign-${campaign.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" data-testid={`text-campaign-name-${campaign.id}`}>{campaign.name}</span>
                        <CampaignStatusBadge status={campaign.status} />
                        {getStateName(campaign.filterStateId) && (
                          <Badge variant="outline" className="text-xs">{getStateName(campaign.filterStateId)}</Badge>
                        )}
                        {campaign.filterChannel && (
                          <Badge variant="outline" className="text-xs">{campaign.filterChannel}</Badge>
                        )}
                        {campaign.filterDaysNoReply && (
                          <Badge variant="outline" className="text-xs">بعد {campaign.filterDaysNoReply} أيام بدون رد</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{campaign.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.totalCount ?? 0} ليد
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {campaign.sentCount ?? 0} أُرسل
                        </span>
                        {(campaign.failedCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            {campaign.failedCount} فشل
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {campaign.scheduledAt ? formatDate(campaign.scheduledAt) : "إرسال فوري"}
                        </span>
                        <span>أُنشئت: {formatDate(campaign.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {campaign.status !== "running" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`button-delete-campaign-${campaign.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الحملة؟</AlertDialogTitle>
                              <AlertDialogDescription>سيتم حذف الحملة وجميع بيانات الإرسال. هذه العملية لا يمكن التراجع عنها.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {(campaign.totalCount ?? 0) > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((campaign.sentCount ?? 0) / (campaign.totalCount ?? 1)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {((campaign.sentCount ?? 0) / (campaign.totalCount ?? 1) * 100).toFixed(0)}% تم الإرسال
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-up Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">قواعد المتابعة التلقائية</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  يتم تنفيذها تلقائياً كل ساعة — ترسل رسالة لكل ليد لم يرد منذ X أيام
                </CardDescription>
              </div>
            </div>
            <CreateFollowupRuleDialog />
          </div>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد قواعد متابعة بعد</p>
              <p className="text-xs mt-1">أضف قاعدة لإرسال رسائل تلقائية للليدز الصامتين</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={`rounded-lg border p-4 transition-colors ${rule.isActive ? "" : "opacity-60"}`}
                  data-testid={`card-rule-${rule.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rule.daysAfterNoReply} أيام بدون رد
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${rule.isActive ? "border-green-300 text-green-700 bg-green-50" : "border-gray-200 text-gray-500"}`}
                        >
                          {rule.isActive ? "مفعّل" : "متوقف"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rule.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        آخر تشغيل: {rule.lastRunAt ? formatDate(rule.lastRunAt) : "لم يُشغَّل بعد"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={rule.isActive ?? false}
                        onCheckedChange={checked => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                        data-testid={`switch-rule-${rule.id}`}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`button-delete-rule-${rule.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف القاعدة؟</AlertDialogTitle>
                            <AlertDialogDescription>سيتم حذف قاعدة المتابعة "{rule.name}" نهائياً.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <RefreshCw className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              الحملات والمتابعة التلقائية تعمل كل دقيقة في الخلفية — لا حاجة لإبقاء الصفحة مفتوحة.
            </p>
            <p className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              يضاف تأخير 3-6 ثوانٍ بين كل رسالة تلقائياً لتجنب حظر الواتساب.
            </p>
            <p className="flex items-start gap-2">
              <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              يُرسل عبر حساب الموظف المسؤول عن كل ليد (follow-up) أو منشئ الحملة (campaigns).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
