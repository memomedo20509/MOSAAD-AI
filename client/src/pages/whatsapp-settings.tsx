import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, SmartphoneNfc, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WaStatusResponse {
  status: WaStatus;
  qrDataUrl: string | null;
}

export default function WhatsAppSettingsPage() {
  const { toast } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, refetch } = useQuery<WaStatusResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: false,
  });

  const status = data?.status ?? "disconnected";
  const qrDataUrl = data?.qrDataUrl ?? null;

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
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p>لم يتم ربط الواتساب بعد</p>
                    <p className="text-xs mt-1">اضغط على زر الاتصال لبدء عملية الربط</p>
                  </div>
                  <Button
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending}
                    className="w-full"
                    data-testid="button-wa-connect"
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    {connectMutation.isPending ? "جاري الاتصال..." : "اتصل بالواتساب"}
                  </Button>
                </div>
              )}

              {(status === "connecting") && (
                <div className="rounded-lg border p-6 text-center space-y-3">
                  <RefreshCw className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جاري الاتصال بالواتساب...</p>
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
