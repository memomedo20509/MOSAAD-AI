import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, Send, Settings, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Lead, LeadState, User } from "@shared/schema";

interface EmailReportSettingsData {
  id?: string;
  userId?: string;
  toEmail: string;
  frequency: string;
  language: string;
  enabled: boolean;
  lastSentAt?: string | null;
}

export default function EmailReportsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [toEmail, setToEmail] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [reportLanguage, setReportLanguage] = useState<"ar" | "en">(
    language === "ar" ? "ar" : "en"
  );
  const [enabled, setEnabled] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: states = [] } = useQuery<LeadState[]>({ queryKey: ["/api/states"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const { data: serverSettings, isLoading: settingsLoading } = useQuery<EmailReportSettingsData | null>({
    queryKey: ["/api/email/settings"],
    queryFn: async () => {
      const res = await fetch("/api/email/settings", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (serverSettings) {
      setToEmail(serverSettings.toEmail || "");
      setFrequency((serverSettings.frequency as "weekly" | "monthly") || "monthly");
      setReportLanguage((serverSettings.language as "ar" | "en") || "ar");
      setEnabled(serverSettings.enabled ?? false);
    }
  }, [serverSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/email/settings", { toEmail, frequency, language: reportLanguage, enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/settings"] });
      toast({ title: t.autoReportSaved });
    },
    onError: (err: Error) => {
      toast({ title: err?.message || t.reportSentError, variant: "destructive" });
    },
  });

  const isManager =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "sales_manager" ||
    user?.role === "company_owner";

  if (!isManager) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t.error}</p>
      </div>
    );
  }

  const buildReportData = () => {
    const doneDealState = states.find(
      (s) =>
        s.name.toLowerCase().includes("done") ||
        s.name.toLowerCase().includes("closed") ||
        s.name.includes("صفقة")
    );

    const totalLeads = leads.length;
    const closedDeals = doneDealState
      ? leads.filter((l) => l.stateId === doneDealState.id).length
      : 0;
    const conversionRate =
      totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : "0";

    const sourceMap: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.channel || "Unknown";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sources = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const agentMap: Record<string, { count: number; deals: number }> = {};
    leads.forEach((l) => {
      const u = users.find((u) => u.id === l.assignedTo);
      const name = u
        ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
        : "Unassigned";
      if (!agentMap[name]) agentMap[name] = { count: 0, deals: 0 };
      agentMap[name].count++;
      if (doneDealState && l.stateId === doneDealState.id) agentMap[name].deals++;
    });
    const agents = Object.entries(agentMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { totalLeads, closedDeals, conversionRate, sources, agents };
  };

  const handleSendNow = async () => {
    if (!toEmail) {
      toast({ title: t.enterEmailFirst, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const reportData = buildReportData();
      await apiRequest("POST", "/api/email/send-report", {
        toEmail,
        reportData,
        language: reportLanguage,
      });
      toast({ title: t.reportSentSuccess });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.reportSentError;
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const closedDealsCount = (() => {
    const ds = states.find(
      (s) =>
        s.name.toLowerCase().includes("done") ||
        s.name.toLowerCase().includes("closed") ||
        s.name.includes("صفقة")
    );
    return ds ? leads.filter((l) => l.stateId === ds.id).length : 0;
  })();

  const frequencyDescription =
    frequency === "weekly"
      ? language === "ar"
        ? "يُرسل تلقائياً كل يوم اثنين الساعة 8 صباحاً"
        : "Sent automatically every Monday at 8 AM"
      : language === "ar"
      ? "يُرسل تلقائياً في أول يوم من كل شهر الساعة 8 صباحاً"
      : "Sent automatically on the 1st of each month at 8 AM";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          data-testid="text-email-reports-title"
        >
          {t.emailReports}
        </h1>
        <p className="text-muted-foreground">{t.emailReportsSubtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-email-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5 text-primary" />
              {t.emailSettings}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="input-report-email">{t.reportEmail}</Label>
                  <Input
                    id="input-report-email"
                    type="email"
                    placeholder={t.reportEmailPlaceholder}
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    data-testid="input-report-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-report-language">
                    {language === "ar" ? "لغة التقرير التلقائي" : "Automated Report Language"}
                  </Label>
                  <Select
                    value={reportLanguage}
                    onValueChange={(v) => setReportLanguage(v as "ar" | "en")}
                  >
                    <SelectTrigger
                      id="select-report-language"
                      data-testid="select-report-language"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">{language === "ar" ? "العربية" : "Arabic"}</SelectItem>
                      <SelectItem value="en">{language === "ar" ? "الإنجليزية" : "English"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-report-frequency">{t.reportFrequency}</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}
                  >
                    <SelectTrigger
                      id="select-report-frequency"
                      data-testid="select-report-frequency"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">{t.reportFrequencyWeekly}</SelectItem>
                      <SelectItem value="monthly">{t.reportFrequencyMonthly}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{frequencyDescription}</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="switch-auto-report" className="font-medium">
                      {t.enableAutoReport}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {enabled
                        ? language === "ar"
                          ? "التقارير التلقائية مفعّلة"
                          : "Automatic reports are enabled"
                        : language === "ar"
                        ? "التقارير التلقائية غير مفعّلة"
                        : "Automatic reports are disabled"}
                    </p>
                  </div>
                  <Switch
                    id="switch-auto-report"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                    data-testid="switch-auto-report"
                  />
                </div>

                {serverSettings?.lastSentAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/50 p-2">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span>
                      {language === "ar" ? "آخر إرسال: " : "Last sent: "}
                      {new Date(serverSettings.lastSentAt).toLocaleDateString(
                        language === "ar" ? "ar-EG" : "en-US",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                  data-testid="button-save-email-settings"
                >
                  {saveSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {t.save}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-send-report-now">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              {t.sendReportNow}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {language === "ar"
                ? "إرسال تقرير أداء شامل فوري بالإيميل يتضمن إجمالي الليدز والصفقات المغلقة وأداء الفريق."
                : "Send an immediate comprehensive performance report via email including total leads, closed deals, and team performance."}
            </p>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.pdfTotalLeads}</span>
                <span className="font-medium">{leads.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.pdfClosedDeals}</span>
                <span className="font-medium">{closedDealsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.pdfLeadSources}</span>
                <span className="font-medium">
                  {new Set(leads.map((l) => l.channel).filter(Boolean)).size}
                </span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSendNow}
              disabled={sending || !toEmail}
              data-testid="button-send-report-now"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sending ? t.sendingReport : t.sendReportNow}
            </Button>

            {!toEmail && (
              <p className="text-xs text-muted-foreground text-center">
                {t.enterEmailFirst}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
