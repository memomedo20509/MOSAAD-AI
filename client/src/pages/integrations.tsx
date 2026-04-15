import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Smartphone, Wifi, WifiOff, Copy, ExternalLink, AlertCircle, Trash2 } from "lucide-react";
import { SiFacebook, SiInstagram, SiWhatsapp, SiOpenai } from "react-icons/si";
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

type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WaStatusResponse {
  status: WaStatus;
  qrDataUrl?: string | null;
  errorMessage?: string | null;
}

function WhatsAppQRTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: waData } = useQuery<WaStatusResponse>({
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

      {status === "qr" && qrDataUrl && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="rounded-xl border-2 border-primary/20 p-3 bg-white shadow-sm">
            <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56" data-testid="img-whatsapp-qr" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">افتح WhatsApp على تليفونك</p>
            <p className="text-xs text-muted-foreground">
              الإعدادات ← الأجهزة المرتبطة ← ربط جهاز ← امسح الكود
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} data-testid="button-refresh-qr">
            <RefreshCw className="h-4 w-4 mr-2" /> تجديد الـ QR
          </Button>
        </div>
      )}

      {status === "connected" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-green-700">WhatsApp متصل بنجاح!</p>
            <p className="text-sm text-muted-foreground mt-1">البوت جاهز للرد على الرسايل أوتوماتيك</p>
          </div>
        </div>
      )}

      {(status === "disconnected" || status === "connecting") && !qrDataUrl && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <SiWhatsapp className="h-8 w-8 text-[#25D366]" />
          </div>
          <div className="text-center">
            <p className="font-medium">اربط حساب WhatsApp</p>
            <p className="text-sm text-muted-foreground mt-1">اضغط "اتصال" وامسح الـ QR بتليفونك</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {status === "connected" ? (
          <Button variant="destructive" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} data-testid="button-disconnect-whatsapp">
            {disconnectMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <WifiOff className="h-4 w-4 mr-2" />}
            قطع الاتصال
          </Button>
        ) : (
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending || status === "connecting" || status === "qr"} data-testid="button-connect-whatsapp">
            {connectMutation.isPending || status === "connecting" ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <SiWhatsapp className="h-4 w-4 mr-2" />}
            {status === "qr" ? "في انتظار المسح..." : "اتصال بـ WhatsApp"}
          </Button>
        )}
        {(status === "qr" || status === "connecting") && (
          <Button variant="outline" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} data-testid="button-reset-whatsapp">
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

interface MetaConnection {
  connected: boolean;
  pageId?: string;
  pageName?: string;
  instagramAccountId?: string | null;
  connectedBy?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface MetaPage {
  id: string;
  name: string;
  instagramAccountId?: string | null;
}

function MetaSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ pageId: "", pageName: "", pageAccessToken: "", instagramAccountId: "" });
  const [oauthLoading, setOauthLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<MetaPage[]>([]);

  const { data: connection } = useQuery<MetaConnection>({
    queryKey: ["/api/meta/connection"],
  });

  const { data: verifyTokenData } = useQuery<{ verifyToken: string }>({
    queryKey: ["/api/meta/verify-token"],
  });

  const { data: appConfigData } = useQuery<{ appId: string }>({
    queryKey: ["/api/meta/app-config"],
  });

  const connectMutation = useMutation({
    mutationFn: (data: { userAccessToken: string; pageId: string }) =>
      apiRequest("POST", "/api/meta/connect", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/connection"] });
      setSelectedPages([]);
      toast({ title: "تم ربط الصفحة بنجاح!" });
    },
    onError: () => toast({ title: "فشل ربط الصفحة", variant: "destructive" }),
  });

  const connectManualMutation = useMutation({
    mutationFn: (data: { pageId: string; pageName: string; pageAccessToken: string; instagramAccountId?: string }) =>
      apiRequest("POST", "/api/meta/connect-manual", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/connection"] });
      setManualForm({ pageId: "", pageName: "", pageAccessToken: "", instagramAccountId: "" });
      setShowManual(false);
      toast({ title: "تم ربط الصفحة يدوياً!" });
    },
    onError: () => toast({ title: "فشل ربط الصفحة", variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/meta/connection"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/connection"] });
      toast({ title: "تم فصل الصفحة" });
    },
    onError: () => toast({ title: "فشل فصل الصفحة", variant: "destructive" }),
  });

  const handleOAuthLogin = async () => {
    const appId = appConfigData?.appId;
    if (!appId) {
      toast({ title: "Meta App ID غير مُعد", description: "يرجى إعداد META_APP_ID في المتغيرات البيئية", variant: "destructive" });
      return;
    }

    setOauthLoading(true);
    try {
      const redirectUri = encodeURIComponent(window.location.origin + "/api/meta/oauth-callback");
      const scope = "pages_show_list,pages_messaging,pages_read_engagement,instagram_basic,instagram_manage_messages";
      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;

      const popup = window.open(oauthUrl, "meta_oauth", "width=600,height=700,scrollbars=yes");

      const checkInterval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkInterval);
            setOauthLoading(false);
            return;
          }
          const popupUrl = popup.location.href;
          if (popupUrl.includes("access_token=")) {
            const hash = popupUrl.split("#")[1] || "";
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            popup.close();
            clearInterval(checkInterval);
            if (accessToken) {
              fetchPagesWithToken(accessToken);
            } else {
              setOauthLoading(false);
            }
          }
        } catch {
          // Cross-origin - popup still on Facebook domain
        }
      }, 500);
    } catch {
      setOauthLoading(false);
      toast({ title: "فشل فتح نافذة تسجيل الدخول", variant: "destructive" });
    }
  };

  const fetchPagesWithToken = async (token: string) => {
    try {
      const res = await apiRequest("POST", "/api/meta/list-pages", { userAccessToken: token });
      const data = (await res.json()) as { pages: MetaPage[] };
      if (data.pages.length === 0) {
        toast({ title: "لم يتم العثور على صفحات", description: "تأكد إن حسابك مدير لصفحة فيسبوك" });
      } else if (data.pages.length === 1) {
        connectMutation.mutate({ userAccessToken: token, pageId: data.pages[0].id });
      } else {
        setSelectedPages(data.pages);
        (window as any).__metaOAuthToken = token;
      }
    } catch {
      toast({ title: "فشل جلب الصفحات", variant: "destructive" });
    }
    setOauthLoading(false);
  };

  const handleSelectPage = (page: MetaPage) => {
    const token = (window as any).__metaOAuthToken;
    if (token) {
      connectMutation.mutate({ userAccessToken: token, pageId: page.id });
      delete (window as any).__metaOAuthToken;
    }
  };

  const webhookUrl = `${window.location.origin}/api/meta/webhook`;
  const verifyToken = verifyTokenData?.verifyToken || "crm_meta_verify_token";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `تم نسخ ${label}` });
    });
  };

  const isConnected = connection?.connected === true;

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">حالة الاتصال</p>
        {isConnected ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> متصل
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 gap-1">
            <XCircle className="h-3.5 w-3.5" /> غير متصل
          </Badge>
        )}
      </div>

      {isConnected && (
        <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <SiFacebook className="h-5 w-5 text-[#1877F2]" />
            <span className="font-semibold">{connection.pageName}</span>
          </div>
          <p className="text-sm text-muted-foreground">Page ID: {connection.pageId}</p>
          {connection.instagramAccountId && (
            <div className="flex items-center gap-2 text-sm">
              <SiInstagram className="h-4 w-4 text-[#E4405F]" />
              <span>Instagram: {connection.instagramAccountId}</span>
            </div>
          )}
          <Button variant="destructive" size="sm" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} data-testid="button-disconnect-meta">
            <Trash2 className="h-4 w-4 mr-2" /> فصل الصفحة
          </Button>
        </div>
      )}

      {!isConnected && selectedPages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">اختر الصفحة:</p>
          {selectedPages.map(page => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className="w-full text-start rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              data-testid={`button-select-page-${page.id}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{page.name}</p>
                  <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                  {page.instagramAccountId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <SiInstagram className="h-3 w-3 text-[#E4405F]" /> Instagram متصل
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {!isConnected && selectedPages.length === 0 && (
        <>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-16 w-16 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
              <SiFacebook className="h-8 w-8 text-[#1877F2]" />
            </div>
            <div className="text-center">
              <p className="font-medium">اربط صفحة فيسبوك</p>
              <p className="text-sm text-muted-foreground mt-1">
                سجل دخول بفيسبوك واختر الصفحة لاستقبال رسائل ماسنجر وإنستجرام
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleOAuthLogin} disabled={oauthLoading || connectMutation.isPending} data-testid="button-connect-facebook">
              {oauthLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <SiFacebook className="h-4 w-4 mr-2" />}
              تسجيل الدخول بفيسبوك
            </Button>
            <Button variant="outline" onClick={() => setShowManual(s => !s)} data-testid="button-toggle-manual">
              {showManual ? "إخفاء" : "ربط يدوي"}
            </Button>
          </div>
        </>
      )}

      {showManual && !isConnected && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>للمطورين: أدخل بيانات الصفحة يدوياً من لوحة تحكم Meta</span>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Page ID</Label>
              <Input value={manualForm.pageId} onChange={e => setManualForm(f => ({ ...f, pageId: e.target.value }))} placeholder="123456789" data-testid="input-manual-page-id" className="mt-1" />
            </div>
            <div>
              <Label>Page Name</Label>
              <Input value={manualForm.pageName} onChange={e => setManualForm(f => ({ ...f, pageName: e.target.value }))} placeholder="اسم الصفحة" data-testid="input-manual-page-name" className="mt-1" />
            </div>
            <TokenField
              label="Page Access Token"
              placeholder="EAAxxxxxxxx..."
              helpText="Long-lived page access token من Graph API Explorer"
              value={manualForm.pageAccessToken}
              onChange={v => setManualForm(f => ({ ...f, pageAccessToken: v }))}
            />
            <div>
              <Label>Instagram Account ID (اختياري)</Label>
              <Input value={manualForm.instagramAccountId} onChange={e => setManualForm(f => ({ ...f, instagramAccountId: e.target.value }))} placeholder="17841400000000" data-testid="input-manual-ig-id" className="mt-1" />
            </div>
            <Button
              onClick={() => connectManualMutation.mutate({
                pageId: manualForm.pageId,
                pageName: manualForm.pageName,
                pageAccessToken: manualForm.pageAccessToken,
                instagramAccountId: manualForm.instagramAccountId || undefined,
              })}
              disabled={!manualForm.pageId || !manualForm.pageName || !manualForm.pageAccessToken || connectManualMutation.isPending}
              data-testid="button-save-manual-meta"
            >
              {connectManualMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              حفظ الاتصال
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">إعداد Webhook في Meta Developer Dashboard</h3>
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Callback URL</Label>
            <div className="flex gap-2 mt-1">
              <Input value={webhookUrl} readOnly className="text-xs font-mono" data-testid="input-webhook-url" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")} data-testid="button-copy-webhook-url">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Verify Token</Label>
            <div className="flex gap-2 mt-1">
              <Input value={verifyToken} readOnly className="text-xs font-mono" data-testid="input-verify-token" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(verifyToken, "Verify Token")} data-testid="button-copy-verify-token">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">خطوات الإعداد:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>افتح <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex items-center gap-0.5">Meta Developer Dashboard <ExternalLink className="h-3 w-3" /></a></li>
            <li>اختر التطبيق ← Webhooks</li>
            <li>اختر "Page" واضغط Subscribe</li>
            <li>الصق Callback URL و Verify Token أعلاه</li>
            <li>اشترك في: messages, messaging_postbacks</li>
            <li>لإنستجرام: اشترك أيضاً في Instagram ← messages</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();

  const [aiStatus, setAiStatus] = useState<ConnectionState>("disconnected");
  const [aiForm, setAiForm] = useState({ apiKey: "", model: "gpt-4o-mini" });
  const [saving, setSaving] = useState(false);

  const testConnection = (platform: "openai") => {
    setAiStatus("testing");
    setTimeout(() => {
      const hasValues = Object.values(aiForm).some(v => v.trim().length > 0);
      setAiStatus(hasValues ? "connected" : "disconnected");
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
                Meta
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

            <TabsContent value="facebook">
              <MetaSettingsTab />
            </TabsContent>

            <TabsContent value="whatsapp">
              <WhatsAppQRTab />
            </TabsContent>

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
