import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Phone, User, Bot, UserCheck } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, WhatsappMessagesLog } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InboxEntry {
  leadId: string;
  leadName: string | null;
  phone: string;
  phone2: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  totalCount: number;
}

interface LeadInfo {
  id: string;
  name: string | null;
  phone: string | null;
  botActive: boolean | null;
  botStage: string | null;
  score: string | null;
  budget: string | null;
  unitType: string | null;
  location: string | null;
}

export default function ConversationsPage() {
  const { toast } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: inbox = [], isLoading } = useQuery<InboxEntry[]>({
    queryKey: ["/api/whatsapp/inbox"],
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<WhatsappMessagesLog[]>({
    queryKey: ["/api/leads", selectedLeadId, "whatsapp-log"],
    enabled: !!selectedLeadId,
    refetchInterval: 5000,
  });

  const { data: leadInfo } = useQuery<LeadInfo>({
    queryKey: ["/api/leads", selectedLeadId],
    enabled: !!selectedLeadId,
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedLeadId) {
      apiRequest("POST", `/api/whatsapp/inbox/${selectedLeadId}/mark-read`).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
      }).catch(() => {});
    }
  }, [selectedLeadId]);

  const sendMutation = useMutation({
    mutationFn: ({ leadId, message }: { leadId: string; message: string }) =>
      apiRequest("POST", "/api/whatsapp/send", { leadId, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId, "whatsapp-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
      setReplyText("");
    },
    onError: () => toast({ title: "فشل إرسال الرسالة", variant: "destructive" }),
  });

  const takeoverMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiRequest("POST", `/api/leads/${leadId}/bot/takeover`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId] });
      toast({ title: "تم تسلّم المحادثة من البوت" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiRequest("POST", `/api/leads/${leadId}/bot/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId] });
      toast({ title: "تم تفعيل البوت مجدداً" });
    },
  });

  const selectedEntry = inbox.find(e => e.leadId === selectedLeadId) ?? null;
  const botActive = leadInfo?.botActive ?? true;
  const botStage = leadInfo?.botStage ?? "greeting";

  const filtered = inbox.filter(entry => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (entry.leadName?.toLowerCase().includes(s)) ||
      entry.phone.includes(s) ||
      (entry.lastMessage?.toLowerCase().includes(s))
    );
  });

  const getBotBadge = () => {
    if (!botActive || botStage === "handed_off") {
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">يدوي</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">بوت نشط</Badge>;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="page-conversations">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">صندوق المحادثات</h1>
        <p className="text-muted-foreground">محادثات واتساب مع العملاء</p>
      </div>

      <div className="flex flex-1 min-h-0 gap-0 border rounded-lg overflow-hidden">
        <div className="w-80 shrink-0 border-r flex flex-col overflow-hidden bg-muted/20">
          <div className="p-3 border-b">
            <Input
              placeholder="بحث بالاسم أو الرقم..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-4">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">لا توجد محادثات</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filtered.map(entry => (
                <button
                  key={entry.leadId}
                  onClick={() => setSelectedLeadId(entry.leadId)}
                  data-testid={`conv-item-${entry.leadId}`}
                  className={cn(
                    "w-full text-start px-3 py-3 border-b hover:bg-muted/50 transition-colors",
                    selectedLeadId === entry.leadId && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 shrink-0 mt-0.5">
                      <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{entry.leadName ?? entry.phone}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {entry.lastMessageAt ? format(new Date(entry.lastMessageAt), "HH:mm") : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {entry.lastMessage ?? "لا توجد رسائل"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground">{entry.phone}</span>
                        {entry.unreadCount > 0 && (
                          <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {entry.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 min-w-0 min-h-0">
          {!selectedEntry ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground flex-col gap-2">
              <MessageSquare className="h-12 w-12" />
              <p>اختر محادثة للعرض</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card shrink-0">
                  <div className="flex items-center gap-2">
                    <SiWhatsapp className="h-4 w-4 text-[#25D366]" />
                    <span className="font-semibold">{selectedEntry.leadName ?? selectedEntry.phone}</span>
                    {getBotBadge()}
                  </div>
                  <div className="flex items-center gap-2">
                    {botActive && botStage !== "handed_off" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedLeadId && takeoverMutation.mutate(selectedLeadId)}
                        disabled={takeoverMutation.isPending}
                        data-testid="button-takeover"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        تسلّم المحادثة
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedLeadId && reactivateMutation.mutate(selectedLeadId)}
                        disabled={reactivateMutation.isPending}
                        data-testid="button-reactivate-bot"
                      >
                        <Bot className="h-4 w-4 mr-1" />
                        تفعيل البوت
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messagesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-2/3" />)}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mb-2" />
                      <p className="text-sm">لا توجد رسائل بعد</p>
                    </div>
                  ) : (
                    <>
                      {messages.map(msg => {
                        const isInbound = msg.direction === "inbound";
                        const isBot = msg.agentName === "البوت";
                        return (
                          <div
                            key={msg.id}
                            className={cn("flex", isInbound ? "justify-start" : "justify-end")}
                            data-testid={`message-${msg.id}`}
                          >
                            <div
                              className={cn(
                                "max-w-xs rounded-xl px-3 py-2 text-sm",
                                isInbound
                                  ? "bg-muted text-foreground"
                                  : isBot
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-orange-500 text-white"
                              )}
                            >
                              <p>{msg.messageText}</p>
                              {msg.botActionsSummary && (
                                <p className="text-xs mt-1 opacity-70 border-t border-white/20 pt-1">
                                  {msg.botActionsSummary}
                                </p>
                              )}
                              <p className="text-xs mt-1 opacity-70">
                                {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                                {!isInbound && (
                                  <span className="ml-1">· {isBot ? "بوت" : msg.agentName || "مندوب"}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="border-t p-3 bg-card shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="اكتب رسالتك..."
                      data-testid="input-reply"
                      dir="rtl"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey && replyText.trim() && selectedLeadId) {
                          sendMutation.mutate({ leadId: selectedLeadId, message: replyText.trim() });
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={() => replyText.trim() && selectedLeadId && sendMutation.mutate({ leadId: selectedLeadId, message: replyText.trim() })}
                      disabled={!replyText.trim() || sendMutation.isPending}
                      data-testid="button-send-reply"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-64 shrink-0 border-l p-4 overflow-y-auto bg-muted/10">
                <h3 className="font-semibold text-sm mb-3">بيانات العميل</h3>
                <div className="space-y-3 text-sm" dir="rtl">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">الاسم</p>
                      <p className="font-medium">{leadInfo?.name ?? selectedEntry.leadName ?? "غير معروف"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">الهاتف</p>
                      <p className="font-medium">{selectedEntry.phone}</p>
                      {selectedEntry.phone2 && <p className="text-xs text-muted-foreground">{selectedEntry.phone2}</p>}
                    </div>
                  </div>

                  {leadInfo?.score && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">التقييم</p>
                      <Badge className={cn(
                        leadInfo.score === "hot" ? "bg-red-100 text-red-700" :
                        leadInfo.score === "warm" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {leadInfo.score === "hot" ? "ساخن" : leadInfo.score === "warm" ? "دافئ" : "بارد"}
                      </Badge>
                    </div>
                  )}

                  {leadInfo?.budget && (
                    <div>
                      <p className="text-muted-foreground text-xs">الميزانية</p>
                      <p className="font-medium">{leadInfo.budget}</p>
                    </div>
                  )}

                  {leadInfo?.unitType && (
                    <div>
                      <p className="text-muted-foreground text-xs">نوع الوحدة</p>
                      <p className="font-medium">{leadInfo.unitType}</p>
                    </div>
                  )}

                  {leadInfo?.location && (
                    <div>
                      <p className="text-muted-foreground text-xs">الموقع</p>
                      <p className="font-medium">{leadInfo.location}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">حالة البوت</p>
                    {getBotBadge()}
                    {botStage && botStage !== "handed_off" && botActive && (
                      <p className="text-xs text-muted-foreground mt-1">المرحلة: {botStage}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <p>الرسائل: {selectedEntry.totalCount}</p>
                    <p>غير مقروءة: {selectedEntry.unreadCount}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
