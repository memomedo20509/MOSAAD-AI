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
import { useLanguage } from "@/lib/i18n";
import { LEGACY_REALESTATE_BOT_ROLE, LEGACY_REALESTATE_COMPANY_NAME, LEGACY_REALESTATE_CHAT_GOAL, LEGACY_REALESTATE_WELCOME_FRAGMENT } from "@/lib/legacy-normalizers";
import type { ChatbotSettings, Project } from "@shared/schema";
import { CHAT_GOALS, CHAT_GOAL_LABELS, CHAT_GOAL_DESCRIPTIONS } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CompanyProfile {
  businessType?: string;
  name?: string;
}

function getDefaultsByBusinessType(businessType: string, t: ReturnType<typeof import("@/lib/i18n").useLanguage>["t"]) {
  if (businessType === "ecommerce") {
    return {
      botName: t.chatbotDefaultBotNameStore,
      companyName: t.chatbotDefaultCompanyNameStore,
      botRole: t.chatbotDefaultBotRoleStore,
      botPersonality: t.chatbotDefaultPersonalityStore,
      botMission: t.chatbotDefaultMissionStore,
      welcomeMessage: t.chatbotDefaultWelcomeStore,
      chatGoal: "order_placement",
    };
  }
  return {
    botName: t.chatbotDefaultBotName,
    companyName: t.chatbotDefaultCompanyName,
    botRole: t.chatbotDefaultBotRole,
    botPersonality: t.chatbotDefaultPersonality,
    botMission: t.chatbotDefaultMission,
    welcomeMessage: t.chatbotDefaultWelcome,
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
  const { t, isRTL } = useLanguage();
  const { data: settings, isLoading } = useQuery<ChatbotSettings>({ queryKey: ["/api/chatbot/settings"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: companyProfile } = useQuery<CompanyProfile>({ queryKey: ["/api/companies/me"] });

  const businessType = companyProfile?.businessType ?? "service";
  const isEcommerce = businessType === "ecommerce";
  const typeDefaults = getDefaultsByBusinessType(businessType, t);

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
      const resolvedBotRole = resolveField(settings.botRole, isEcommerce ? LEGACY_REALESTATE_BOT_ROLE : null, typeDefaults.botRole);
      const resolvedCompanyName = resolveField(settings.companyName, isEcommerce ? LEGACY_REALESTATE_COMPANY_NAME : null, typeDefaults.companyName);
      const resolvedChatGoal = (isEcommerce && (settings.chatGoal === LEGACY_REALESTATE_CHAT_GOAL || !settings.chatGoal))
        ? typeDefaults.chatGoal
        : (settings.chatGoal ?? typeDefaults.chatGoal);
      const rawWelcome = settings.welcomeMessage ?? "";
      const resolvedWelcome = (isEcommerce && rawWelcome.includes(LEGACY_REALESTATE_WELCOME_FRAGMENT))
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
      toast({ title: t.chatbotSaved });
    },
    onError: () => toast({ title: t.chatbotSaveError, variant: "destructive" }),
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
    { role: "user", content: t.chatbotPreviewUserBrowse },
    { role: "bot", content: t.chatbotPreviewBotBrowse },
    { role: "user", content: t.chatbotPreviewUserOrder },
    { role: "bot", content: t.chatbotPreviewBotOrder },
  ] : [
    { role: "bot", content: form.welcomeMessage || typeDefaults.welcomeMessage },
    { role: "user", content: t.chatbotPreviewUserInterest },
    { role: "bot", content: t.chatbotPreviewBotAskName },
    { role: "user", content: t.chatbotPreviewUserName },
    { role: "bot", content: t.chatbotPreviewBotGreet },
  ];

  const availableGoals = isEcommerce
    ? CHAT_GOALS.filter(g => g === "order_placement" || g === "custom")
    : CHAT_GOALS.filter(g => g !== "order_placement");

  return (
    <div className="space-y-6" data-testid="page-chatbot-config" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t.chatbotTitle}</h1>
            {isEcommerce && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                {t.chatbotEcommerceBadge}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isEcommerce ? t.chatbotSubtitleEcommerce : t.chatbotSubtitle}
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          data-testid="button-save-config"
        >
          <Save className="h-4 w-4 me-2" />
          {saveMutation.isPending ? t.chatbotSaving : t.chatbotSaveBtn}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.chatbotIdentityTitle}</CardTitle>
              <CardDescription>{t.chatbotIdentityDesc}</CardDescription>
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
                    <Label htmlFor="bot-active">{t.chatbotActivate}</Label>
                    <Badge className={form.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }>
                      {form.isActive ? t.chatbotActiveLabel : t.chatbotInactiveLabel}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="chat-goal">{t.chatbotGoal}</Label>
                    </div>
                    <Select value={form.chatGoal} onValueChange={v => setForm(f => ({ ...f, chatGoal: v }))}>
                      <SelectTrigger id="chat-goal" data-testid="select-chat-goal">
                        <SelectValue placeholder={t.chatbotGoalPlaceholder} />
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
                    <Label htmlFor="bot-name">{t.chatbotName}</Label>
                    <Input
                      id="bot-name"
                      data-testid="input-bot-name"
                      value={form.botName}
                      onChange={e => setForm(f => ({ ...f, botName: e.target.value }))}
                      placeholder={typeDefaults.botName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-name">{t.chatbotCompanyName}</Label>
                    <Input
                      id="company-name"
                      data-testid="input-company-name"
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                      placeholder={typeDefaults.companyName}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-role">{t.chatbotRole}</Label>
                    <Input
                      id="bot-role"
                      data-testid="input-bot-role"
                      value={form.botRole}
                      onChange={e => setForm(f => ({ ...f, botRole: e.target.value }))}
                      placeholder={typeDefaults.botRole}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bot-personality">{t.chatbotPersonality}</Label>
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
                      {isEcommerce ? t.chatbotMissionEcommerce : t.chatbotMission}
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
                    <Label htmlFor="welcome-message">{t.chatbotWelcomeMsg}</Label>
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
              <CardTitle>{isEcommerce ? t.chatbotKnowledgeTitleEcommerce : t.chatbotKnowledgeTitle}</CardTitle>
              <CardDescription>
                {isEcommerce ? t.chatbotKnowledgeDescEcommerce : t.chatbotKnowledgeDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="company-knowledge"
                data-testid="input-company-knowledge"
                value={form.companyKnowledge}
                onChange={e => setForm(f => ({ ...f, companyKnowledge: e.target.value }))}
                placeholder={isEcommerce ? t.chatbotKnowledgePlaceholderEcommerce : t.chatbotKnowledgePlaceholder}
                rows={5}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{t.chatbotHoursTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hours-start">{t.chatbotHoursStart}</Label>
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
                  <Label htmlFor="hours-end">{t.chatbotHoursEnd}</Label>
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
                <Label htmlFor="respond-always">{t.chatbotRespondAlways}</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.chatbotRespondAlwaysHint}
              </p>
            </CardContent>
          </Card>

          {!isEcommerce && projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.chatbotProjectsTitle}</CardTitle>
                <CardDescription>{t.chatbotProjectsDesc}</CardDescription>
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
                  <CardTitle>{t.chatbotEcommerceMode}</CardTitle>
                </div>
                <CardDescription>{t.chatbotEcommerceModeDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <p>✅ {t.chatbotEcommerceFeature1}</p>
                  <p>✅ {t.chatbotEcommerceFeature2}</p>
                  <p>✅ {t.chatbotEcommerceFeature3}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">{t.chatbotEcommerceFeature4}</p>
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
                <CardTitle>{t.chatbotPreviewTitle}</CardTitle>
              </div>
              <CardDescription>
                {isEcommerce ? t.chatbotPreviewDescEcommerce : t.chatbotPreviewDesc}
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
