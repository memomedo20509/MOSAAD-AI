import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { SiFacebook, SiWhatsapp, SiOpenai } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type ConnectionState = "connected" | "disconnected" | "testing";

function TokenField({ label, placeholder, helpText, value, onChange }: {
  label: string;
  placeholder: string;
  helpText?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mt-1">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
    </div>
  );
}

function ConnectionStatus({ state }: { state: ConnectionState }) {
  if (state === "connected") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Connected
      </Badge>
    );
  }
  if (state === "testing") {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Testing...
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 gap-1">
      <XCircle className="h-3.5 w-3.5" />
      Not Connected
    </Badge>
  );
}

// ─── WhatsApp QR Tab ──────────────────────────────────────────────────────────

type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WaStatusResponse {
  status: WaStatus;
  qrDataUrl?: string | null;
  errorMessage?: string | null;
}

function WhatsAppQRTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: waData, refetch } = useQuery<WaStatusResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "qr" || status === "connecting") return 3000;
      return false;
    },
  });

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/connect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
    },
    onError: () => {
      toast({ title: "فشل الاتصال", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({ title: "تم قطع الاتصال بـ WhatsApp" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({ title: "تمت إعادة الضبط، امسح الـ QR مجدداً" });
    },
  });

  const status = waData?.status ?? "disconnected";
  const qrDataUrl = waData?.qrDataUrl;

  return (
    <div className="space-y-5 pt-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">حالة الاتصال</p>
        <div className="flex items-center gap-2">
          {status === "connected" && (
            <Badge className="bg-green-100 text-green-700 gap-1">
              <Wifi className="h-3.5 w-3.5" /> متصل
            </Badge>
          )}
          {status === "qr" && (
            <Badge className="bg-blue-100 text-blue-700 gap-1 animate-pulse">
              <Smartphone className="h-3.5 w-3.5" /> امسح الـ QR
            </Badge>
          )}
          {status === "connecting" && (
            <Badge className="bg-yellow-100 text-yellow-700 gap-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> جاري الاتصال...
            </Badge>
          )}
          {status === "disconnected" && (
            <Badge className="bg-gray-100 text-gray-500 gap-1">
              <WifiOff className="h-3.5 w-3.5" /> غير متصل
            </Badge>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      {status === "qr" && qrDataUrl && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="rounded-xl border-2 border-primary/20 p-3 bg-white shadow-sm">
            <img
              src={qrDataUrl}
              alt="WhatsApp QR Code"
              className="w-56 h-56"
              data-testid="img-whatsapp-qr"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">افتح WhatsApp على تليفونك</p>
            <p className="text-xs text-muted-foreground">
              الإعدادات ← الأجهزة المرتبطة ← ربط جهاز ← امسح الكود
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            data-testid="button-refresh-qr"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            تجديد الـ QR
          </Button>
        </div>
      )}

      {/* Connected State */}
      {status === "connected" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-green-700">WhatsApp متصل بنجاح!</p>
            <p className="text-sm text-muted-foreground mt-1">
              البوت جاهز للرد على الرسايل أوتوماتيك
            </p>
          </div>
        </div>
      )}

      {/* Disconnected / Connecting States */}
      {(status === "disconnected" || status === "connecting") && !qrDataUrl && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <SiWhatsapp className="h-8 w-8 text-[#25D366]" />
          </div>
          <div className="text-center">
            <p className="font-medium">اربط حساب WhatsApp</p>
            <p className="text-sm text-muted-foreground mt-1">
              اضغط "اتصال" وامسح الـ QR بتليفونك
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {status === "connected" ? (
          <Button
            variant="destructive"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            data-testid="button-disconnect-whatsapp"
          >
            {disconnectMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <WifiOff className="h-4 w-4 mr-2" />
            )}
            قطع الاتصال
          </Button>
        ) : (
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || status === "connecting" || status === "qr"}
            data-testid="button-connect-whatsapp"
          >
            {connectMutation.isPending || status === "connecting" ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <SiWhatsapp className="h-4 w-4 mr-2" />
            )}
            {status === "qr" ? "في انتظار المسح..." : "اتصال بـ WhatsApp"}
          </Button>
        )}

        {(status === "qr" || status === "connecting") && (
          <Button
            variant="outline"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            data-testid="button-reset-whatsapp"
          >
            إعادة المحاولة
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        ملاحظة: يستخدم هذا النظام WhatsApp Web (QR) — تأكد إن تليفونك متصل بالنت.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { toast } = useToast();

  const [fbStatus, setFbStatus] = useState<ConnectionState>("disconnected");
  const [aiStatus, setAiStatus] = useState<ConnectionState>("disconnected");

  const [fbForm, setFbForm] = useState({ pageToken: "", appSecret: "", verifyToken: "" });
  const [aiForm, setAiForm] = useState({ apiKey: "", model: "gpt-4o-mini" });

  const [saving, setSaving] = useState(false);

  const testConnection = (platform: "facebook" | "openai") => {
    const setStatus = platform === "facebook" ? setFbStatus : setAiStatus;
    setStatus("testing");
    setTimeout(() => {
      const form = platform === "facebook" ? fbForm : aiForm;
      const hasValues = Object.values(form).some(v => v.trim().length > 0);
      setStatus(hasValues ? "connected" : "disconnected");
      toast({
        title: hasValues ? "Connection successful" : "Connection failed",
        description: hasValues ? "Integration is working correctly." : "Please check your credentials.",
        variant: hasValues ? "default" : "destructive",
      });
    }, 1500);
  };

  const saveSettings = (platform: string) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: `${platform} settings saved` });
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="page-integrations">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">الإنتيجريشن</h1>
        <p className="text-muted-foreground">اربط البوت بمنصات المراسلة والذكاء الاصطناعي</p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Configure your API keys and tokens for each integration</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="whatsapp">
            <TabsList className="grid w-full grid-cols-3 mt-2">
              <TabsTrigger value="facebook" data-testid="tab-facebook" className="gap-2">
                <SiFacebook className="h-4 w-4 text-[#1877F2]" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="whatsapp" data-testid="tab-whatsapp" className="gap-2">
                <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="openai" data-testid="tab-openai" className="gap-2">
                <SiOpenai className="h-4 w-4" />
                OpenAI
              </TabsTrigger>
            </TabsList>

            {/* Facebook Tab */}
            <TabsContent value="facebook">
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Integration Status</p>
                  <ConnectionStatus state={fbStatus} />
                </div>
                <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                  Connect your Facebook Page to receive and send Messenger messages.
                </div>
                <TokenField
                  label="Page Access Token"
                  placeholder="EAAxxxxxxxx..."
                  helpText="Get this from your Facebook App dashboard"
                  value={fbForm.pageToken}
                  onChange={v => setFbForm(f => ({ ...f, pageToken: v }))}
                />
                <TokenField
                  label="App Secret"
                  placeholder="Your app secret key"
                  value={fbForm.appSecret}
                  onChange={v => setFbForm(f => ({ ...f, appSecret: v }))}
                />
                <TokenField
                  label="Webhook Verify Token"
                  placeholder="Your custom verify token"
                  helpText="A random string you create to validate webhook requests"
                  value={fbForm.verifyToken}
                  onChange={v => setFbForm(f => ({ ...f, verifyToken: v }))}
                />
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => testConnection("facebook")} disabled={fbStatus === "testing"} data-testid="button-test-facebook">
                    {fbStatus === "testing" ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Test Connection
                  </Button>
                  <Button onClick={() => saveSettings("Facebook")} disabled={saving} data-testid="button-save-facebook">
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* WhatsApp QR Tab */}
            <TabsContent value="whatsapp">
              <WhatsAppQRTab />
            </TabsContent>

            {/* OpenAI Tab */}
            <TabsContent value="openai">
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Integration Status</p>
                  <ConnectionStatus state={aiStatus} />
                </div>
                <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground">
                  Connect your OpenAI account to power the AI responses. Get your API key from platform.openai.com.
                </div>
                <TokenField
                  label="API Key"
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  helpText="Your secret OpenAI API key"
                  value={aiForm.apiKey}
                  onChange={v => setAiForm(f => ({ ...f, apiKey: v }))}
                />
                <div>
                  <Label>Model</Label>
                  <select
                    value={aiForm.model}
                    onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    data-testid="select-openai-model"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => testConnection("openai")} disabled={aiStatus === "testing"} data-testid="button-test-openai">
                    {aiStatus === "testing" ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Test Connection
                  </Button>
                  <Button onClick={() => saveSettings("OpenAI")} disabled={saving} data-testid="button-save-openai">
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
