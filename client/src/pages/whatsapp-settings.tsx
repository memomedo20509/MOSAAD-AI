import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, SmartphoneNfc, CheckCircle2, AlertCircle, XCircle, Trash2, Bot, Clock, MessageSquare, Save, Building2, User, Sparkles, AlarmClock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WaStatusResponse {
  status: WaStatus;
  qrDataUrl: string | null;
  errorMessage: string | null;
}

interface ChatbotSettings {
  userId?: string;
  isActive: boolean;
  workingHoursStart: number;
  workingHoursEnd: number;
  welcomeMessage: string;
  botName?: string;
  companyName?: string;
  botPersonality?: string;
  respondAlways?: boolean;
}

export default function WhatsAppSettingsPage() {
  const { toast } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [botForm, setBotForm] = useState<ChatbotSettings>({
    isActive: false,
    workingHoursStart: 9,
    workingHoursEnd: 18,
    welcomeMessage: "أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية. يسعدني مساعدتك. ممكن تعرفني باسمك الكريم؟",
    botName: "المساعد الذكي",
    companyName: "شركتنا العقارية",
    botPersonality: "أنت مساعد مبيعات عقارية ذكي ولطيف وودود. تتكلم بالعربية المصرية بشكل طبيعي. مهمتك مساعدة العملاء واستخراج بياناتهم بطريقة محترمة وغير ملحّة.",
    respondAlways: false,
  });

  const { data, isLoading, refetch } = useQuery<WaStatusResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: false,
  });

  const { data: botSettings, isLoading: botLoading } = useQuery<ChatbotSettings>({
    queryKey: ["/api/chatbot/settings"],
  });

  useEffect(() => {
    if (botSettings) {
      setBotForm({
        isActive: botSettings.isActive ?? false,
        workingHoursStart: botSettings.workingHoursStart ?? 9,
        workingHoursEnd: botSettings.workingHoursEnd ?? 18,
        welcomeMessage: botSettings.welcomeMessage ?? "أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية. يسعدني مساعدتك. ممكن تعرفني باسمك الكريم؟",
        botName: botSettings.botName ?? "المساعد الذكي",
        companyName: botSettings.companyName ?? "شركتنا العقارية",
        botPersonality: botSettings.botPersonality ?? "أنت مساعد مبيعات عقارية ذكي ولطيف وودود. تتكلم بالعربية المصرية بشكل طبيعي. مهمتك مساعدة العملاء واستخراج بياناتهم بطريقة محترمة وغير ملحّة.",
        respondAlways: botSettings.respondAlways ?? false,
      });
    }
  }, [botSettings]);

  const status = data?.status ?? "disconnected";
  const qrDataUrl = data?.qrDataUrl ?? null;
  const errorMessage = data?.errorMessage ?? null;

  useEffect(() => {
    if (status === "qr" || status === "connecting") {
      pollRef.current = setInterval(() => {
        refetch();
      }, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, refetch]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whatsapp/connect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      refetch();
    },
    onError: () => {
      toast({ title: "فشل في الاتصال بالواتساب", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whatsapp/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      refetch();
      toast({ title: "تم مسح البيانات القديمة وبدء اتصال جديد" });
    },
    onError: () => {
      toast({ title: "فشل في إعادة الضبط، حاول مرة أخرى", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whatsapp/disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      refetch();
      toast({ title: "تم قطع الاتصال بالواتساب" });
    },
    onError: () => {
      toast({ title: "فشل في قطع الاتصال", variant: "destructive" });
    },
  });

  const saveBotSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/chatbot/settings", botForm);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot/settings"] });
      toast({ title: "تم حفظ إعدادات الشات بوت بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const statusConfig: Record<WaStatus, { label: string; color: string; icon: JSX.Element }> = {
    connected: {
      label: "متصل",
      color: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    connecting: {
      label: "جاري الاتصال...",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    },
    qr: {
      label: "في انتظار المسح",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: <SmartphoneNfc className="h-4 w-4" />,
    },
    disconnected: {
      label: "غير متصل",
      color: "bg-gray-100 text-gray-600 border-gray-200",
      icon: <WifiOff className="h-4 w-4" />,
    },
  };

  const cfg = statusConfig[status];
  const isResetting = resetMutation.isPending;
  const isConnecting = connectMutation.isPending;

  const formatHour = (h: number) => {
    const period = h < 12 ? "ص" : "م";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display} ${period}`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back-whatsapp">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-whatsapp-title">
            ربط الواتساب
          </h1>
          <p className="text-muted-foreground">اربط حسابك الشخصي على واتساب لإرسال رسائل المتابعة</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">حالة الاتصال</CardTitle>
              <CardDescription>اربط هاتفك بمسح الـ QR Code</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 px-3 py-1 ${cfg.color}`}
              data-testid="badge-wa-status"
            >
              {cfg.icon}
              {cfg.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-40" />
            </div>
          ) : (
            <>
              {status === "disconnected" && (
                <div className="space-y-3">
                  {errorMessage ? (
                    <>
                      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">حدث خطأ في الاتصال</p>
                          <p className="text-xs text-red-600 dark:text-red-500 mt-1">{errorMessage}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <Trash2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                              مسح البيانات القديمة وإعادة الاتصال
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                              في حالة تكرار الخطأ، اضغط هذا الزرار — سيمسح بيانات الاتصال القديمة ويبدأ من جديد ويظهر لك كود QR جديد.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => resetMutation.mutate()}
                          disabled={isResetting}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                          data-testid="button-wa-reset"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isResetting ? "جاري المسح وإعادة الاتصال..." : "مسح وإعادة الاتصال"}
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => connectMutation.mutate()}
                        disabled={isConnecting}
                        className="w-full"
                        data-testid="button-wa-connect"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {isConnecting ? "جاري المحاولة..." : "إعادة المحاولة فقط"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                        <p>لم يتم ربط الواتساب بعد</p>
                        <p className="text-xs mt-1">اضغط على زر الاتصال لبدء عملية الربط وعرض كود QR</p>
                      </div>
                      <Button
                        onClick={() => connectMutation.mutate()}
                        disabled={isConnecting}
                        className="w-full"
                        data-testid="button-wa-connect"
                      >
                        <Wifi className="h-4 w-4 mr-2" />
                        {isConnecting ? "جاري الاتصال..." : "اتصل بالواتساب"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => resetMutation.mutate()}
                        disabled={isResetting}
                        className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                        data-testid="button-wa-reset-clean"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isResetting ? "جاري المسح وإعادة الاتصال..." : "مسح وإعادة الاتصال (في حالة الخطأ)"}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {status === "connecting" && (
                <div className="space-y-3">
                  <div className="rounded-lg border p-6 text-center space-y-3">
                    <RefreshCw className="h-10 w-10 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">جاري الاتصال بالواتساب...</p>
                    <p className="text-xs text-muted-foreground">سيظهر كود QR خلال ثوانٍ</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetMutation.mutate()}
                    disabled={isResetting}
                    className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                    data-testid="button-wa-reset-connecting"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isResetting ? "جاري المسح..." : "تأخر الاتصال؟ امسح وابدأ من جديد"}
                  </Button>
                </div>
              )}

              {status === "qr" && qrDataUrl && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 bg-white flex flex-col items-center gap-3">
                    <img
                      src={qrDataUrl}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64"
                      data-testid="img-wa-qr"
                    />
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      افتح واتساب على هاتفك، اضغط على القائمة ← الأجهزة المرتبطة ← ربط جهاز، ثم امسح الكود
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="w-full"
                    data-testid="button-wa-refresh-qr"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    تحديث الكود
                  </Button>
                </div>
              )}

              {status === "connected" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">الواتساب متصل</p>
                      <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">
                        يمكنك الآن إرسال رسائل المتابعة للليدز مباشرة من النظام
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="w-full"
                    data-testid="button-wa-disconnect"
                  >
                    <WifiOff className="h-4 w-4 mr-2" />
                    {disconnectMutation.isPending ? "جاري قطع الاتصال..." : "قطع الاتصال"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Chatbot Settings Section ── */}
      <Card data-testid="card-chatbot-settings">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">الشات بوت الذكي</CardTitle>
                <CardDescription>ردود تلقائية ذكية على العملاء بعد ساعات الدوام</CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={botForm.isActive
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
              }
              data-testid="badge-bot-status"
            >
              {botForm.isActive ? "مفعّل" : "معطّل"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {botLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              {/* Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium" htmlFor="bot-toggle">تفعيل الشات بوت</Label>
                  <p className="text-xs text-muted-foreground">عند التفعيل، البوت يرد تلقائياً على الليدز الجدد</p>
                </div>
                <Switch
                  id="bot-toggle"
                  checked={botForm.isActive}
                  onCheckedChange={(v) => setBotForm(f => ({ ...f, isActive: v }))}
                  data-testid="switch-bot-active"
                />
              </div>

              {/* Working Hours */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>ساعات الدوام</span>
                </div>
                <p className="text-xs text-muted-foreground">البوت يرد تلقائياً خارج ساعات الدوام هذه</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">بداية الدوام</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={botForm.workingHoursStart}
                        onChange={(e) => setBotForm(f => ({ ...f, workingHoursStart: parseInt(e.target.value) || 0 }))}
                        className="w-20 text-center"
                        data-testid="input-bot-hours-start"
                      />
                      <span className="text-sm text-muted-foreground">{formatHour(botForm.workingHoursStart)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">نهاية الدوام</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={botForm.workingHoursEnd}
                        onChange={(e) => setBotForm(f => ({ ...f, workingHoursEnd: parseInt(e.target.value) || 18 }))}
                        className="w-20 text-center"
                        data-testid="input-bot-hours-end"
                      />
                      <span className="text-sm text-muted-foreground">{formatHour(botForm.workingHoursEnd)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Respond Always toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium" htmlFor="respond-always">الرد في كل الأوقات</Label>
                  <p className="text-xs text-muted-foreground">عند التفعيل، البوت يرد على العملاء في أي وقت (مش بس بعد الدوام)</p>
                </div>
                <Switch
                  id="respond-always"
                  checked={botForm.respondAlways ?? false}
                  onCheckedChange={(v) => setBotForm(f => ({ ...f, respondAlways: v }))}
                  data-testid="switch-respond-always"
                />
              </div>

              {/* Bot Identity */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>هوية البوت</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">اسم البوت</Label>
                    <Input
                      value={botForm.botName ?? ""}
                      onChange={(e) => setBotForm(f => ({ ...f, botName: e.target.value }))}
                      placeholder="المساعد الذكي"
                      className="text-sm"
                      dir="rtl"
                      data-testid="input-bot-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">اسم الشركة</Label>
                    <Input
                      value={botForm.companyName ?? ""}
                      onChange={(e) => setBotForm(f => ({ ...f, companyName: e.target.value }))}
                      placeholder="شركتنا العقارية"
                      className="text-sm"
                      dir="rtl"
                      data-testid="input-company-name"
                    />
                  </div>
                </div>
              </div>

              {/* Bot Personality */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>شخصية البوت وأسلوبه</span>
                </div>
                <Textarea
                  value={botForm.botPersonality ?? ""}
                  onChange={(e) => setBotForm(f => ({ ...f, botPersonality: e.target.value }))}
                  rows={4}
                  placeholder="مثال: أنت مستشار عقاري محترف وودود، تتكلم بالمصري، وتساعد العملاء باحترام دون ضغط..."
                  className="resize-none text-sm"
                  dir="rtl"
                  data-testid="textarea-bot-personality"
                />
                <p className="text-xs text-muted-foreground">وصف شخصية البوت وأسلوبه في الرد — الذكاء الاصطناعي سيلتزم بهذا الوصف</p>
              </div>

              {/* Welcome Message */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>رسالة الترحيب</span>
                </div>
                <Textarea
                  value={botForm.welcomeMessage}
                  onChange={(e) => setBotForm(f => ({ ...f, welcomeMessage: e.target.value }))}
                  rows={3}
                  placeholder="أهلاً! أنا المساعد الذكي..."
                  className="resize-none text-sm"
                  dir="rtl"
                  data-testid="textarea-bot-welcome"
                />
                <p className="text-xs text-muted-foreground">هذه الرسالة ستُرسل تلقائياً كأول رد للعميل الجديد</p>
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-3 space-y-1.5">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">كيف يعمل البوت؟</p>
                <ul className="text-xs text-blue-600 dark:text-blue-500 space-y-1 list-disc list-inside">
                  <li>يرد تلقائياً على الرسائل الواردة (بعد الدوام أو دايماً حسب الإعداد)</li>
                  <li>يتكلم بالعربية المصرية وبالأسلوب اللي حددته</li>
                  <li>يجمع بيانات العميل: الاسم، الميزانية، نوع الوحدة، عدد الغرف</li>
                  <li>يجيب على أسئلة المشاريع من قاعدة البيانات</li>
                  <li>بعد جمع البيانات، يحيل العميل للمندوب المعيّن</li>
                  <li>المندوب يمكنه تعطيل البوت لأي ليد من بانيل الليد</li>
                </ul>
              </div>

              <Button
                className="w-full"
                onClick={() => saveBotSettingsMutation.mutate()}
                disabled={saveBotSettingsMutation.isPending}
                data-testid="button-save-bot-settings"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveBotSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الشات بوت"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ملاحظات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <p>الرسائل يتم إرسالها من حسابك الشخصي على واتساب — تأكد من أن الأرقام صحيحة قبل الإرسال.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <p>يتم حفظ الجلسة تلقائياً — لن تحتاج لمسح الكود في كل مرة إلا إذا قطعت الاتصال يدوياً.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <p>لا تُرسل رسائل كثيرة في وقت قصير — النظام يضيف تأخيراً تلقائياً لتجنب الحظر.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
