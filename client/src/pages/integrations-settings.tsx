import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  MessageSquare,
  Bot,
  Key,
  Info,
  Copy,
  ShieldOff,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";

interface IntegrationSettings {
  whatsappCloudToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappVerifyToken?: string | null;
  openAiApiKey?: string | null;
  openAiModel?: string | null;
}

const ADMIN_ROLES = ["super_admin", "admin", "company_owner"];

export default function IntegrationsSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");

  const [form, setForm] = useState<IntegrationSettings>({
    whatsappCloudToken: "",
    whatsappPhoneNumberId: "",
    whatsappVerifyToken: "",
    openAiApiKey: "",
    openAiModel: "gpt-4o-mini",
  });

  const { data: settings, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integration-settings"],
    enabled: isAdmin,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        whatsappCloudToken: settings.whatsappCloudToken ?? "",
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? "",
        whatsappVerifyToken: settings.whatsappVerifyToken ?? "",
        openAiApiKey: settings.openAiApiKey ?? "",
        openAiModel: settings.openAiModel ?? "gpt-4o-mini",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: IntegrationSettings) => {
      const res = await apiRequest("PUT", "/api/integration-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integration-settings"] });
      toast({ title: t.intLegacySaved });
    },
    onError: () => {
      toast({ title: t.intLegacyFail, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${t.intLegacyCopied} ${label}` });
    });
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/webhook/whatsapp`
    : "/webhook/whatsapp";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center" dir={isRTL ? "rtl" : "ltr"}>
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">{t.intLegacyPermDenied}</p>
          <p className="text-muted-foreground text-sm">{t.intLegacyAdminOnly}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back-integrations">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-integrations-title">
            {t.intLegacyTitle}
          </h1>
          <p className="text-muted-foreground">{t.intLegacyDesc}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* WhatsApp Business Cloud API */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle className="text-base">{t.intLegacyWaTitle}</CardTitle>
                  <CardDescription>{t.intLegacyWaDesc}</CardDescription>
                </div>
                {settings?.whatsappCloudToken && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 ms-auto">
                    <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                    {t.intLegacyConnected}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wa-token" className="text-sm">{t.waAccessToken}</Label>
                <Input
                  id="wa-token"
                  type="password"
                  value={form.whatsappCloudToken ?? ""}
                  onChange={e => setForm(f => ({ ...f, whatsappCloudToken: e.target.value }))}
                  placeholder="EAAxxxxxxx..."
                  data-testid="input-wa-cloud-token"
                />
                <p className="text-xs text-muted-foreground">{t.intLegacyWaTokenHelp}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-phone-id" className="text-sm">{t.waPhoneNumberId}</Label>
                <Input
                  id="wa-phone-id"
                  value={form.whatsappPhoneNumberId ?? ""}
                  onChange={e => setForm(f => ({ ...f, whatsappPhoneNumberId: e.target.value }))}
                  placeholder="123456789012345"
                  data-testid="input-wa-phone-number-id"
                />
                <p className="text-xs text-muted-foreground">{t.intLegacyWaPhoneHelp}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wa-verify-token" className="text-sm">{t.intLegacyWaVerifyLabel}</Label>
                <Input
                  id="wa-verify-token"
                  value={form.whatsappVerifyToken ?? ""}
                  onChange={e => setForm(f => ({ ...f, whatsappVerifyToken: e.target.value }))}
                  placeholder="my_custom_verify_token"
                  data-testid="input-wa-verify-token"
                />
                <p className="text-xs text-muted-foreground">{t.intLegacyWaVerifyHelp}</p>
              </div>

              {/* Webhook URL info */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>{t.intLegacyWebhookLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 break-all" data-testid="text-wa-webhook-url">
                    {webhookUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                    data-testid="button-copy-wa-webhook-url"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.intLegacyWebhookHelp}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* OpenAI Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-base">{t.intLegacyOaiTitle}</CardTitle>
                  <CardDescription>{t.intLegacyOaiDesc}</CardDescription>
                </div>
                {settings?.openAiApiKey && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 ms-auto">
                    <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                    {t.intLegacyConnected}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="openai-key" className="text-sm">
                  <Key className="h-3.5 w-3.5 inline me-1" />
                  {t.openaiApiKey}
                </Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={form.openAiApiKey ?? ""}
                  onChange={e => setForm(f => ({ ...f, openAiApiKey: e.target.value }))}
                  placeholder="sk-proj-..."
                  data-testid="input-openai-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  {t.intLegacyOaiKeyHelp}{" "}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    platform.openai.com
                  </a>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openai-model" className="text-sm">{t.intLegacyModelLabel}</Label>
                <Input
                  id="openai-model"
                  value={form.openAiModel ?? ""}
                  onChange={e => setForm(f => ({ ...f, openAiModel: e.target.value }))}
                  placeholder="gpt-4o-mini"
                  data-testid="input-openai-model"
                />
                <p className="text-xs text-muted-foreground">
                  {t.intLegacyModelHelp}
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 p-3 text-xs text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">{t.intLegacyNote}</p>
                <p>{t.intLegacyNoteText}</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            data-testid="button-save-integrations"
          >
            <Save className="h-4 w-4 me-2" />
            {saveMutation.isPending ? t.intLegacySaving : t.intLegacySaveBtn}
          </Button>
        </>
      )}
    </div>
  );
}
