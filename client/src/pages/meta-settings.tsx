import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  WifiOff,
  Facebook,
  Instagram,
  Link2,
  Trash2,
  Copy,
  Info,
  ExternalLink,
  ShieldOff,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MetaConnection {
  connected: boolean;
  id?: string;
  pageId?: string;
  pageName?: string;
  instagramAccountId?: string;
  connectedBy?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface VerifyTokenResponse {
  verifyToken: string;
}

interface FacebookPage {
  id: string;
  name: string;
  instagramAccountId?: string;
}

interface FacebookPagesResponse {
  pages: FacebookPage[];
}

const ADMIN_ROLES = ["super_admin", "admin", "sales_admin", "company_owner"];

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;

declare global {
  interface Window {
    FB: {
      init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (cb: (res: { authResponse?: { accessToken: string; userID: string } }) => void, opts?: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function loadFbSdk(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) { resolve(); return; }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: false, version: "v19.0" });
      resolve();
    };
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.head.appendChild(script);
  });
}

export default function MetaSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");

  const [manualForm, setManualForm] = useState({
    pageId: "",
    pageName: "",
    pageAccessToken: "",
    instagramAccountId: "",
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
  const [oauthUserToken, setOauthUserToken] = useState<string>("");
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [connectingPageId, setConnectingPageId] = useState<string | null>(null);

  const { data: connection, isLoading } = useQuery<MetaConnection>({
    queryKey: ["/api/meta/connection"],
  });

  const { data: verifyTokenData } = useQuery<VerifyTokenResponse>({
    queryKey: ["/api/meta/verify-token"],
  });

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/meta/webhook`
    : "/api/meta/webhook";
  const verifyToken = verifyTokenData?.verifyToken ?? "crm_meta_verify_token";

  const connectManualMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meta/connect-manual", manualForm);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/connection"] });
      setShowManualForm(false);
      setManualForm({ pageId: "", pageName: "", pageAccessToken: "", instagramAccountId: "" });
      toast({ title: "تم ربط الصفحة بنجاح" });
    },
    onError: (err: unknown) => {
      const msg = (err as Error).message ?? "فشل في ربط الصفحة";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const connectPageMutation = useMutation({
    mutationFn: async ({ pageId, userAccessToken }: { pageId: string; userAccessToken: string }) => {
      const res = await apiRequest("POST", "/api/meta/connect", { pageId, userAccessToken });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/connection"] });
      setShowPagePicker(false);
      setAvailablePages([]);
      setOauthUserToken("");
      setConnectingPageId(null);
      toast({ title: "تم ربط الصفحة بنجاح" });
    },
    onError: (err: unknown) => {
      const msg = (err as Error).message ?? "فشل في ربط الصفحة";
      setConnectingPageId(null);
      toast({ title: msg, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/meta/connection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/connection"] });
      toast({ title: "تم فك ربط الصفحة" });
    },
    onError: () => {
      toast({ title: "فشل في فك الربط", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `تم نسخ ${label}` });
    });
  };

  const handleFacebookLogin = useCallback(async () => {
    if (!META_APP_ID) {
      toast({
        title: "VITE_META_APP_ID غير مضبوط",
        description: "أضف متغير البيئة VITE_META_APP_ID بقيمة App ID من تطبيق Meta Developer، أو استخدم الإدخال اليدوي",
        variant: "destructive",
      });
      return;
    }
    setOauthLoading(true);
    try {
      await loadFbSdk(META_APP_ID);
      window.FB.login(async (response) => {
        if (!response.authResponse?.accessToken) {
          setOauthLoading(false);
          toast({ title: "تم إلغاء تسجيل الدخول", variant: "destructive" });
          return;
        }
        const userToken = response.authResponse.accessToken;
        try {
          const res = await apiRequest("POST", "/api/meta/list-pages", { userAccessToken: userToken });
          const data = (await res.json()) as FacebookPagesResponse;
          if (!data.pages || data.pages.length === 0) {
            toast({ title: "لا توجد صفحات", description: "لم يتم العثور على صفحات فيسبوك مرتبطة بهذا الحساب", variant: "destructive" });
          } else if (data.pages.length === 1) {
            setConnectingPageId(data.pages[0].id);
            connectPageMutation.mutate({ pageId: data.pages[0].id, userAccessToken: userToken });
          } else {
            setOauthUserToken(userToken);
            setAvailablePages(data.pages);
            setShowPagePicker(true);
          }
        } catch {
          toast({ title: "فشل في جلب الصفحات", variant: "destructive" });
        } finally {
          setOauthLoading(false);
        }
      }, { scope: "pages_show_list,pages_messaging,pages_read_engagement,instagram_basic,instagram_manage_messages" });
    } catch {
      setOauthLoading(false);
      toast({ title: "فشل في تحميل Facebook SDK", variant: "destructive" });
    }
  }, [connectPageMutation, toast]);

  const isConnected = connection?.connected === true;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center" dir="rtl">
        <ShieldOff className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">صلاحية مرفوضة</p>
          <p className="text-muted-foreground text-sm">هذه الصفحة للمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back-meta">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-meta-title">
            ربط فيسبوك وإنستجرام
          </h1>
          <p className="text-muted-foreground">ربط صفحة فيسبوك لاستقبال رسائل ماسنجر وإنستجرام تلقائياً</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-base">حالة الاتصال</CardTitle>
                <CardDescription>ربط صفحة فيسبوك لاستقبال الرسائل</CardDescription>
              </div>
            </div>
            {!isLoading && (
              <Badge
                variant="outline"
                className={isConnected
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
                }
                data-testid="badge-meta-status"
              >
                {isConnected ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />متصل</>
                ) : (
                  <><WifiOff className="h-3.5 w-3.5 mr-1" />غير متصل</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : isConnected ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      الصفحة مرتبطة: {connection.pageName}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Page ID: {connection.pageId}
                    </p>
                  </div>
                </div>
                {connection.instagramAccountId && (
                  <div className="flex items-center gap-2 mt-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <p className="text-sm text-green-700 dark:text-green-400">
                      إنستجرام مرتبط (ID: {connection.instagramAccountId})
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="w-full"
                data-testid="button-meta-disconnect"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {disconnectMutation.isPending ? "جاري فك الربط..." : "فك ربط الصفحة"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                <Facebook className="h-8 w-8 mx-auto mb-2 text-blue-400 opacity-60" />
                <p>لم يتم ربط أي صفحة فيسبوك</p>
              </div>

              {/* Page picker after OAuth */}
              {showPagePicker && availablePages.length > 0 && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium">اختر الصفحة التي تريد ربطها:</p>
                  <div className="space-y-2">
                    {availablePages.map((page) => (
                      <div key={page.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{page.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setConnectingPageId(page.id);
                            connectPageMutation.mutate({ pageId: page.id, userAccessToken: oauthUserToken });
                          }}
                          disabled={connectPageMutation.isPending}
                          data-testid={`button-select-page-${page.id}`}
                        >
                          {connectingPageId === page.id && connectPageMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "ربط"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setShowPagePicker(false); setAvailablePages([]); setOauthUserToken(""); }}>
                    إلغاء
                  </Button>
                </div>
              )}

              {/* Primary: OAuth login button */}
              {!showPagePicker && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleFacebookLogin}
                  disabled={oauthLoading || connectPageMutation.isPending}
                  data-testid="button-meta-oauth"
                >
                  {oauthLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />جاري التحميل...</>
                  ) : (
                    <><Facebook className="h-4 w-4 mr-2" />ربط صفحة فيسبوك</>
                  )}
                </Button>
              )}

              {/* Secondary: Manual fallback */}
              {!showPagePicker && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">أو</span>
                    </div>
                  </div>

                  {!showManualForm ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowManualForm(true)}
                      data-testid="button-meta-manual"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      إدخال Token يدوياً
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-4">
                      <h3 className="font-medium text-sm">إدخال يدوي (للمطورين)</h3>
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor="page-id">Page ID *</Label>
                        <Input
                          id="page-id"
                          value={manualForm.pageId}
                          onChange={(e) => setManualForm(f => ({ ...f, pageId: e.target.value }))}
                          placeholder="123456789"
                          data-testid="input-meta-page-id"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor="page-name">اسم الصفحة *</Label>
                        <Input
                          id="page-name"
                          value={manualForm.pageName}
                          onChange={(e) => setManualForm(f => ({ ...f, pageName: e.target.value }))}
                          placeholder="My Real Estate Page"
                          data-testid="input-meta-page-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor="page-token">Page Access Token *</Label>
                        <Input
                          id="page-token"
                          type="password"
                          value={manualForm.pageAccessToken}
                          onChange={(e) => setManualForm(f => ({ ...f, pageAccessToken: e.target.value }))}
                          placeholder="EAAxxxxxxx..."
                          data-testid="input-meta-page-token"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor="ig-account-id">Instagram Business Account ID (اختياري)</Label>
                        <Input
                          id="ig-account-id"
                          value={manualForm.instagramAccountId}
                          onChange={(e) => setManualForm(f => ({ ...f, instagramAccountId: e.target.value }))}
                          placeholder="17841400000000000"
                          data-testid="input-meta-ig-id"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => connectManualMutation.mutate()}
                          disabled={connectManualMutation.isPending || !manualForm.pageId || !manualForm.pageName || !manualForm.pageAccessToken}
                          data-testid="button-meta-save"
                        >
                          {connectManualMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowManualForm(false)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Setup Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">إعداد Webhook في Meta Developer</CardTitle>
              <CardDescription>اتبع هذه الخطوات لربط الصفحة بالنظام</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>اذهب إلى <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="h-3 w-3" /></a></li>
            <li>افتح تطبيقك ← Webhooks ← اختر "Page" أو "Instagram"</li>
            <li>اضغط "Edit Subscription" وادخل بيانات الـ Webhook التالية:</li>
          </ol>

          <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Callback URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 break-all" data-testid="text-webhook-url">
                  {webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrl, "Callback URL")}
                  data-testid="button-copy-webhook-url"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Verify Token</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5" data-testid="text-verify-token">
                  {verifyToken}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(verifyToken, "Verify Token")}
                  data-testid="button-copy-verify-token"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-muted-foreground" start={4}>
            <li>في Subscription Fields اختر: <strong>messages</strong> و <strong>messaging_postbacks</strong></li>
            <li>لربط الصفحة: اضغط زر "ربط صفحة فيسبوك" أعلاه، أو أدخل Page Access Token يدوياً</li>
            <li>أضف <code className="font-mono bg-muted px-1 rounded">VITE_META_APP_ID</code> في متغيرات البيئة لتفعيل تسجيل الدخول بفيسبوك تلقائياً</li>
          </ol>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-medium">ملاحظات مهمة:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>الـ Page Access Token يجب أن يكون Long-Lived Token</li>
              <li>تأكد أن التطبيق في Meta لديه صلاحية: pages_messaging</li>
              <li>لاستقبال Instagram DM يجب إضافة صلاحية: instagram_basic, instagram_manage_messages</li>
              <li><strong>مطلوب لاستقبال الرسائل:</strong> أضف <code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">META_APP_SECRET</code> في متغيرات البيئة (App Secret من صفحة Meta Developer) — بدونه لن تُعالج رسائل Webhook الواردة</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Channel Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">القنوات المدعومة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <Facebook className="h-8 w-8 text-blue-600 shrink-0" />
            <div>
              <p className="font-medium text-sm">ماسنجر</p>
              <p className="text-xs text-muted-foreground">رسائل صفحة فيسبوك</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <Instagram className="h-8 w-8 text-pink-500 shrink-0" />
            <div>
              <p className="font-medium text-sm">إنستجرام</p>
              <p className="text-xs text-muted-foreground">Direct Messages فقط</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
