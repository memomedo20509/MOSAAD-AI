import { useEffect, useRef } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
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
import { format } from "date-fns";
import { useState } from "react";
import type { WhatsappTemplate, Lead, WhatsappMessagesLog } from "@shared/schema";

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

function ChatBubble({ msg }: { msg: WhatsappMessagesLog }) {
  const isOutbound = msg.direction === "outbound" || !msg.direction;
  const time = msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : "";
  const text = msg.messageText;

  if (!text) return null;

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isOutbound
            ? "bg-green-500 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
        }`}
        data-testid={`bubble-wa-${msg.id}`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOutbound ? "text-green-100" : "text-gray-400 dark:text-gray-500"}`}>
          <span className="text-[10px]">{time}</span>
          {isOutbound && msg.agentName && (
            <span className="text-[10px] opacity-80">· {msg.agentName}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsAppPanel({ lead, agentName }: WhatsAppPanelProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: statusData, isLoading: statusLoading } = useQuery<WaStatusResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: false,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<WhatsappTemplate[]>({
    queryKey: ["/api/whatsapp/templates"],
  });

  const { data: conversation = [], isLoading: convLoading } = useQuery<WhatsappMessagesLog[]>({
    queryKey: ["/api/leads", lead.id, "whatsapp-conversation"],
    enabled: !!lead.id,
    refetchInterval: 15000,
  });

  const status = statusData?.status ?? "disconnected";
  const isConnected = status === "connected";

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation.length]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "whatsapp-conversation"] });
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

  const hasConversation = conversation.some(m => m.messageText);

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

      <CardContent className="space-y-3 p-3">
        {/* Chat Conversation Bubbles */}
        {convLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-3/4 ml-auto rounded-2xl" />
            <Skeleton className="h-8 w-2/3 rounded-2xl" />
          </div>
        ) : hasConversation ? (
          <div className="rounded-lg border bg-[#e5ddd5] dark:bg-gray-900 overflow-hidden">
            <div className="px-2 py-1 bg-green-600 text-white text-xs text-center">
              محادثة واتساب مع {lead.name || lead.phone}
            </div>
            <ScrollArea className="h-52 p-2" data-testid="scroll-wa-conversation">
              <div className="space-y-1">
                {conversation.filter(m => m.messageText).map((msg) => (
                  <ChatBubble key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        ) : null}

        {/* Send Panel */}
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
                rows={3}
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
