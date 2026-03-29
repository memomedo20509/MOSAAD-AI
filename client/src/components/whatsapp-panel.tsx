import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wifi,
  WifiOff,
  Send,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { WhatsappTemplate, Lead } from "@shared/schema";

type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WaStatusResponse {
  status: WaStatus;
  qrDataUrl: string | null;
}

interface WhatsAppPanelProps {
  lead: Lead;
  agentName?: string;
}

function interpolateTemplate(body: string, lead: Lead): string {
  return body
    .replace(/\{\{client_name\}\}/g, lead.name || "")
    .replace(/\{\{phone\}\}/g, lead.phone || "")
    .replace(/\{\{project_name\}\}/g, lead.location || lead.campaign || "");
}

export function WhatsAppPanel({ lead, agentName }: WhatsAppPanelProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [messageText, setMessageText] = useState("");

  const { data: statusData, isLoading: statusLoading } = useQuery<WaStatusResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: false,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: ["/api/whatsapp/templates"],
  });

  const status = statusData?.status ?? "disconnected";
  const isConnected = status === "connected";

  function handleTemplateChange(id: string) {
    setSelectedTemplateId(id);
    const tmpl = templates?.find((t) => t.id === id);
    if (tmpl) {
      setMessageText(interpolateTemplate(tmpl.body, lead));
    }
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whatsapp/send", {
        leadId: lead.id,
        templateId: selectedTemplateId || undefined,
        message: messageText,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "history"] });
      setMessageText("");
      setSelectedTemplateId("");
      toast({ title: "تم إرسال الرسالة بنجاح" });
    },
    onError: (err: any) => {
      toast({
        title: "فشل في إرسال الرسالة",
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            واتساب
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                isConnected
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }
              data-testid="badge-wa-status-actions"
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  متصل
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  غير متصل
                </>
              )}
            </Badge>
            <Link href="/settings/whatsapp">
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-wa-settings-link">
                <LinkIcon className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!isConnected ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            <WifiOff className="h-6 w-6 mx-auto mb-2 text-muted-foreground/60" />
            <p>الواتساب غير متصل</p>
            <Link href="/settings/whatsapp">
              <button className="text-xs mt-1 text-primary underline" data-testid="button-wa-connect-link">
                اضغط هنا لربط حسابك
              </button>
            </Link>
          </div>
        ) : !lead.phone ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            <p>لا يوجد رقم هاتف للليد</p>
          </div>
        ) : (
          <>
            {templatesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : templates && templates.length > 0 ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">اختر قالب</label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger data-testid="select-wa-template">
                    <SelectValue placeholder="اختر قالب أو اكتب رسالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} data-testid={`option-template-${t.id}`}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                نص الرسالة — إلى: {lead.phone}
              </label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                rows={4}
                className="text-sm"
                data-testid="textarea-wa-message"
              />
            </div>

            <Button
              className="w-full"
              disabled={!messageText.trim() || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
              data-testid="button-wa-send"
            >
              {sendMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  إرسال عبر واتساب
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
