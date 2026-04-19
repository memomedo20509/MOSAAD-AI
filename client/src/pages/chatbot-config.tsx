import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, MessageSquare, Save, Clock, Target, ShoppingBag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatbotSettings, Project } from "@shared/schema";
import { CHAT_GOALS, CHAT_GOAL_LABELS, CHAT_GOAL_DESCRIPTIONS } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CompanyProfile {
  businessType?: string;
  name?: string;
}

const LEGACY_REALESTATE = {
  botRole: "مستشار عقاري",
  companyName: "شركتنا العقارية",
  chatGoal: "lead_qualified",
  welcomeMessageFragment: "العقارية",
};

function getDefaultsByBusinessType(businessType: string) {
  if (businessType === "ecommerce") {
    return {
      botName: "مساعد المتجر",
      companyName: "متجرنا",
      botRole: "مساعد متجر",
      botPersonality: "أنت مساعد متجر إلكتروني مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء يلاقوا المنتجات المناسبة وبتخلصهم طلباتهم بسهولة وسرعة.",
      botMission: "مساعدة العميل في تصفح المنتجات المتاحة وإتمام طلبه بالكامل بما يشمل: المنتجات والكميات وعنوان التوصيل.",
      welcomeMessage: "أهلاً! 👋 أنا مساعد متجرنا الذكي. يسعدني أساعدك تلاقي اللي تدور عليه. ممكن تعرفني باسمك الكريم؟",
      chatGoal: "order_placement",
    };
  }
  return {
    botName: "المساعد الذكي",
    companyName: "شركتنا",
    botRole: "مستشار مبيعات",
    botPersonality: "أنت مستشار مبيعات مصري محترف وودود. بتتكلم بالمصري بشكل طبيعي. بتساعد العملاء وبتجمع بياناتهم بطريقة محترمة.",
    botMission: "جمع بيانات العميل الكاملة وترشيح الخدمات المناسبة قبل تحويله للمندوب.",
    welcomeMessage: "أهلاً! 👋 أنا المساعد الذكي لشركتنا. يسعدني مساعدتك. ممكن تعرفني باسمك الكريم؟",
    chatGoal: "lead_qualified",
  };
}

function resolveField(value: string | null | undefined, legacyValue: string | null | undefined, typeDefault: string): string {
  if (!value) return typeDefault;
  if (legacyValue && value === legacyValue) return typeDefault;
  return value;
}

export default function ChatbotConfigPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<ChatbotSettings>({ queryKey: ["/api/chatbot/settings"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: companyProfile } = useQuery<CompanyProfile>({ queryKey: ["/api/companies/me"] });

  const businessType = companyProfile?.businessType ?? "service";
  const isEcommerce = businessType === "ecommerce";
  const typeDefaults = getDefaultsByBusinessType(businessType);

  const [form, setForm] = useState({
    isActive: false,
    chatGoal: typeDefaults.chatGoal as string,
    botName: typeDefaults.botName,
    companyName: typeDefaults.companyName,
    botRole: typeDefaults.botRole,
    botPersonality: "",
    botMission: "",
    companyKnowledge: "",
    welcomeMessage: "",
    workingHoursStart: 9,
    workingHoursEnd: 18,
    respondAlways: false,
    enabledProjectIds: null as string[] | null,
  });

  useEffect(() => {
    if (settings) {
      const lre = isEcommerce ? LEGACY_REALESTATE : null;
      const resolvedBotRole = resolveField(settings.botRole, lre?.botRole, typeDefaults.botRole);
      const resolvedCompanyName = resolveField(settings.companyName, lre?.companyName, typeDefaults.companyName);
      const resolvedChatGoal = (isEcommerce && (settings.chatGoal === "lead_qualified" || !settings.chatGoal))
        ? typeDefaults.chatGoal
        : (settings.chatGoal ?? typeDefaults.chatGoal);
      const rawWelcome = settings.welcomeMessage ?? "";
      const resolvedWelcome = (isEcommerce && rawWelcome.includes(LEGACY_REALESTATE.welcomeMessageFragment))
        ? typeDefaults.welcomeMessage
        : (rawWelcome || typeDefaults.welcomeMessage);
      setForm({
        isActive: settings.isActive ?? false,
        chatGoal: resolvedChatGoal,
        botName: settings.botName ?? typeDefaults.botName,
        companyName: resolvedCompanyName,
        botRole: resolvedBotRole,
        botPersonality: settings.botPersonality ?? "",
        botMission: settings.botMission ?? "",
        companyKnowledge: settings.companyKnowledge ?? "",
        welcomeMessage: resolvedWelcome,
        workingHoursStart: settings.workingHoursStart ?? 9,
        workingHoursEnd: settings.workingHoursEnd ?? 18,
        respondAlways: settings.respondAlways ?? false,
        enabledProjectIds: settings.enabledProjectIds ?? null,
      });
    }
  }, [settings, businessType]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("PUT", "/api/chatbot/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot/settings"] });
      toast({ title: "تم حفظ إعدادات البوت" });
    },
    onError: () => toast({ title: "فشل حفظ الإعدادات", variant: "destructive" }),
  });

  const toggleProject = (projectId: string) => {
    setForm(f => {
      const current = f.enabledProjectIds ?? [];
      const isEnabled = current.includes(projectId);
      const next = isEnabled
        ? current.filter(id => id !== projectId)
        : [...current, projectId];
      return { ...f, enabledProjectIds: next.length > 0 ? next : null };
    });
  };

  const previewMessages = isEcommerce ? [
    { role: "bot", content: form.welcomeMessage || typeDefaults.welcomeMessage },
    { role: "user", content: "عايز أشوف المنتجات" },
    { role: "bot", content: "تمام! عندنا تشكيلة رائعة. هقولك على أفضل المنتجات المتاحة دلوقتي 🛍️" },
    { role: "user", content: "عايز 2 حبة من المنتج الأول" },
    { role: "bot", content: "تمام! دلوقتي محتاج عنوان التوصيل منك علشان نكمل الطلب 📦" },
  ] : [
    { role: "bot", content: form.welcomeMessage || typeDefaults.welcomeMessage },
    { role: "user", content: "أنا مهتم بخدماتكم" },
    { role: "bot", content: "تمام! ممكن تعرفني باسمك الكريم؟" },
    { role: "user", content: "أنا أحمد" },
    { role: "bot", content: "أهلاً أحمد! يسعدنا خدمتك. إيه اللي تدور عليه بالضبط؟" },
  ];

  const availableGoals = isEcommerce
    ? CHAT_GOALS.filter(g => g === "order_placement" || g === "custom")
    : CHAT_GOALS.filter(g => g !== "order_placement");

  return (
    <div className="space-y-6" data-testid="page-chatbot-config" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">إعدادات البوت الذكي</h1>
            {isEcommerce && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                متجر إلكتروني
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isEcommerce
              ? "تخصيص مساعد المتجر الذكي لاستقبال الطلبات وخدمة العملاء"
              : "تخصيص شخصية ومهمة مساعد المبيعات الذكي"}
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          data-testid="button-save-config"
        >
          <Save className="h-4 w-4 ml-2" />
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الهوية والشخصية</CardTitle>
              <CardDescription>حدد اسم البوت وشخصيته</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <Switch
                      id="bot-active"
                      checked={form.isActive}
                      onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                      data-testid="switch-bot-active"
                    />
                    <Label htmlFor="bot-active">تفعيل البوت</Label>
                    <Badge className={form.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }>
                      {form.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="chat-goal">هدف المحادثة</Label>
                    </div>
                    <Select value={form.chatGoal} onValueChange={v => setForm(f => ({ ...f, chatGoal: v }))}>
                      <SelectTrigger id="chat-goal" data-testid="select-chat-goal">
                        <SelectValue placeholder="اختر هدف البوت" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGoals.map(goal => (
                          <SelectItem key={goal} value={goal}>
                            <div>
                              <p className="font-medium">{CHAT_GOAL_LABELS[goal]}</p>
                              <p className="text-xs text-muted-foreground">{CHAT_GOAL_DESCRIPTIONS[goal]}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bot-name">اسم البوت</Label>
                    <Input
                      id="bot-name"
                      data-testid="input-bot-name"
                      value={form.botName}
                      onChange={e => setForm(f => ({ ...f, botName: e.target.value }))}
                      placeholder={typeDefaults.botName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-name">اسم الشركة</Label>
                    <Input
                      id="company-name"
                      data-testid="input-company-name"
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                      placeholder={typeDefaults.companyName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-role">دور البوت</Label>
                    <Input
                      id="bot-role"
                      data-testid="input-bot-role"
                      value={form.botRole}
                      onChange={e => setForm(f => ({ ...f, botRole: e.target.value }))}
                      placeholder={typeDefaults.botRole}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-personality">شخصية البوت</Label>
                    <Textarea
                      id="bot-personality"
                      data-testid="input-bot-personality"
                      value={form.botPersonality}
                      onChange={e => setForm(f => ({ ...f, botPersonality: e.target.value }))}
                      placeholder={typeDefaults.botPersonality}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-mission">
                      {isEcommerce ? "مهمة البوت (تدفق الطلب)" : "مهمة البوت"}
                    </Label>
                    <Textarea
                      id="bot-mission"
                      data-testid="input-bot-mission"
                      value={form.botMission}
                      onChange={e => setForm(f => ({ ...f, botMission: e.target.value }))}
                      placeholder={typeDefaults.botMission}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="welcome-message">رسالة الترحيب</Label>
                    <Textarea
                      id="welcome-message"
                      data-testid="input-welcome-message"
                      value={form.welcomeMessage}
                      onChange={e => setForm(f => ({ ...f, welcomeMessage: e.target.value }))}
                      placeholder={typeDefaults.welcomeMessage}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isEcommerce ? "معلومات المتجر" : "معلومات الشركة"}</CardTitle>
              <CardDescription>
                {isEcommerce
                  ? "معلومات إضافية عن المتجر والسياسات يستخدمها البوت في المحادثات"
                  : "معلومات إضافية يستخدمها البوت في المحادثات"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="company-knowledge"
                data-testid="input-company-knowledge"
                value={form.companyKnowledge}
                onChange={e => setForm(f => ({ ...f, companyKnowledge: e.target.value }))}
                placeholder={isEcommerce
                  ? "معلومات عن المتجر، سياسات التوصيل والاسترجاع، العروض الحالية، مناطق التغطية..."
                  : "معلومات عن الشركة، سياسات الدفع، العروض الحالية..."}
                rows={5}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>ساعات العمل والاستجابة</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hours-start">بداية الدوام</Label>
                  <Input
                    id="hours-start"
                    type="number"
                    min={0}
                    max={23}
                    value={form.workingHoursStart}
                    onChange={e => setForm(f => ({ ...f, workingHoursStart: parseInt(e.target.value) || 9 }))}
                    data-testid="input-hours-start"
                  />
                </div>
                <div>
                  <Label htmlFor="hours-end">نهاية الدوام</Label>
                  <Input
                    id="hours-end"
                    type="number"
                    min={0}
                    max={23}
                    value={form.workingHoursEnd}
                    onChange={e => setForm(f => ({ ...f, workingHoursEnd: parseInt(e.target.value) || 18 }))}
                    data-testid="input-hours-end"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="respond-always"
                  checked={form.respondAlways}
                  onCheckedChange={v => setForm(f => ({ ...f, respondAlways: v }))}
                  data-testid="switch-respond-always"
                />
                <Label htmlFor="respond-always">الرد دائماً (حتى أثناء ساعات العمل)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                عند التعطيل، يرد البوت فقط خارج ساعات العمل المحددة
              </p>
            </CardContent>
          </Card>

          {!isEcommerce && projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>المشاريع المفعّلة</CardTitle>
                <CardDescription>اختر المشاريع التي يمكن للبوت ترشيح وحداتها (اتركها فارغة لتفعيل الكل)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.map((project: Project) => (
                  <div key={project.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`project-${project.id}`}
                      checked={form.enabledProjectIds?.includes(project.id) ?? false}
                      onCheckedChange={() => toggleProject(project.id)}
                      data-testid={`checkbox-project-${project.id}`}
                    />
                    <Label htmlFor={`project-${project.id}`} className="text-sm">
                      {project.name}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isEcommerce && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>وضع المتجر الإلكتروني</CardTitle>
                </div>
                <CardDescription>البوت يعمل في وضع المتجر: يعرض المنتجات ويستقبل الطلبات مباشرة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <p>✅ البوت يعرض المنتجات المتاحة من كتالوج المنتجات</p>
                  <p>✅ يجمع الطلب (المنتج + الكمية + عنوان التوصيل)</p>
                  <p>✅ يُنشئ طلباً تلقائياً في النظام عند تأكيد العميل</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">لإدارة المنتجات والمخزون اذهب لصفحة المنتجات</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-4 self-start">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle>معاينة المحادثة</CardTitle>
              </div>
              <CardDescription>
                {isEcommerce ? "شكل محادثة إتمام الطلب" : "شكل المحادثة مع العملاء"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3 max-h-[500px] overflow-y-auto">
                <div className="flex items-center gap-2 pb-2 border-b mb-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    {isEcommerce ? (
                      <ShoppingBag className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{form.botName || typeDefaults.botName}</p>
                    <p className="text-xs text-muted-foreground">{form.botRole || typeDefaults.botRole}</p>
                  </div>
                </div>
                {previewMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-start" : "justify-end")}>
                    {msg.role === "bot" && (
                      <div className="flex items-end gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0 mb-0.5">
                          <MessageSquare className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="bg-card rounded-xl rounded-tr-sm px-3 py-2 text-sm max-w-[85%] shadow-sm border">
                          {msg.content}
                        </div>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="bg-primary text-primary-foreground rounded-xl rounded-tl-sm px-3 py-2 text-sm max-w-[85%]">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
