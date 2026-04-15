import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Phone, User, Bot, UserCheck } from "lucide-react";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WhatsappMessagesLog, SocialMessagesLog } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "whatsapp" | "messenger" | "instagram";

interface WhatsappInboxItem {
  leadId: string;
  leadName: string | null;
  phone: string;
  phone2: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  totalCount: number;
}

interface SocialInboxItem {
  leadId: string;
  leadName: string | null;
  senderId: string;
  platform: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  totalCount: number;
}

interface UnifiedConversation {
  leadId: string;
  leadName: string | null;
  identifier: string;
  platform: "whatsapp" | "messenger" | "instagram";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  totalCount: number;
  phone2?: string | null;
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

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  messenger: <SiFacebook className="h-4 w-4 text-[#1877F2]" />,
  instagram: <SiInstagram className="h-4 w-4 text-[#E4405F]" />,
  whatsapp: <SiWhatsapp className="h-4 w-4 text-[#25D366]" />,
};

const PLATFORM_LABEL: Record<string, string> = {
  messenger: "ماسنجر",
  instagram: "إنستجرام",
  whatsapp: "واتساب",
};

interface UnifiedMessage {
  id: string;
  direction: string;
  messageText: string | null;
  agentName: string | null;
  createdAt: string | null;
  botActionsSummary?: string | null;
}

export default function ConversationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedConv, setSelectedConv] = useState<UnifiedConversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: waInbox = [], isLoading: waLoading } = useQuery<WhatsappInboxItem[]>({
    queryKey: ["/api/whatsapp/inbox"],
    refetchInterval: 10000,
  });

  const { data: socialInbox = [], isLoading: socialLoading } = useQuery<SocialInboxItem[]>({
    queryKey: ["/api/social-inbox"],
    refetchInterval: 10000,
  });

  const unified: UnifiedConversation[] = [
    ...waInbox.map((w): UnifiedConversation => ({
      leadId: w.leadId,
      leadName: w.leadName,
      identifier: w.phone,
      platform: "whatsapp",
      lastMessage: w.lastMessage,
      lastMessageAt: w.lastMessageAt,
      unreadCount: w.unreadCount,
      totalCount: w.totalCount,
      phone2: w.phone2,
    })),
    ...socialInbox.map((s): UnifiedConversation => ({
      leadId: s.leadId,
      leadName: s.leadName,
      identifier: s.senderId,
      platform: s.platform as "messenger" | "instagram",
      lastMessage: s.lastMessage,
      lastMessageAt: s.lastMessageAt,
      unreadCount: s.unreadCount,
      totalCount: s.totalCount,
    })),
  ].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  const isWhatsApp = selectedConv?.platform === "whatsapp";
  const isSocial = selectedConv?.platform === "messenger" || selectedConv?.platform === "instagram";

  const { data: waMessages = [], isLoading: waMsgLoading } = useQuery<WhatsappMessagesLog[]>({
    queryKey: ["/api/leads", selectedConv?.leadId, "whatsapp-log"],
    enabled: !!selectedConv && isWhatsApp,
    refetchInterval: 5000,
  });

  const { data: socialMessages = [], isLoading: socialMsgLoading } = useQuery<SocialMessagesLog[]>({
    queryKey: ["/api/leads", selectedConv?.leadId, "social-messages", selectedConv?.platform],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${selectedConv!.leadId}/social-messages?platform=${selectedConv!.platform}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedConv && isSocial,
    refetchInterval: 5000,
  });

  const { data: leadInfo } = useQuery<LeadInfo>({
    queryKey: ["/api/leads", selectedConv?.leadId],
    enabled: !!selectedConv,
  });

  const messages: UnifiedMessage[] = isWhatsApp
    ? waMessages.map(m => ({
        id: m.id,
        direction: m.direction ?? "inbound",
        messageText: m.messageText,
        agentName: m.agentName,
        createdAt: m.createdAt ? String(m.createdAt) : null,
        botActionsSummary: (m as any).botActionsSummary ?? null,
      }))
    : socialMessages.map(m => ({
        id: m.id,
        direction: m.direction ?? "inbound",
        messageText: m.messageText,
        agentName: m.agentName,
        createdAt: m.createdAt ? String(m.createdAt) : null,
        botActionsSummary: m.botActionsSummary ?? null,
      }));

  const messagesLoading = waMsgLoading || socialMsgLoading;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendSocialMutation = useMutation({
    mutationFn: ({ leadId, messageText, platform }: { leadId: string; messageText: string; platform: string }) =>
      apiRequest("POST", `/api/leads/${leadId}/social-messages/send`, { messageText, platform }),
    onSuccess: () => {
      if (selectedConv) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedConv.leadId, "social-messages", selectedConv.platform] });
        queryClient.invalidateQueries({ queryKey: ["/api/social-inbox"] });
      }
      setReplyText("");
      toast({ title: "تم إرسال الرسالة" });
    },
    onError: () => toast({ title: "فشل الإرسال", variant: "destructive" }),
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: ({ leadId, message }: { leadId: string; message: string }) =>
      apiRequest("POST", "/api/whatsapp/send", { leadId, message }),
    onSuccess: () => {
      if (selectedConv) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedConv.leadId, "whatsapp-log"] });
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
      }
      setReplyText("");
    },
    onError: () => toast({ title: "فشل إرسال الرسالة", variant: "destructive" }),
  });

  const takeoverMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiRequest("POST", `/api/leads/${leadId}/bot/takeover`),
    onSuccess: () => {
      if (selectedConv) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedConv.leadId] });
      }
      toast({ title: "تم تسلّم المحادثة من البوت" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiRequest("POST", `/api/leads/${leadId}/bot/reactivate`),
    onSuccess: () => {
      if (selectedConv) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedConv.leadId] });
      }
      toast({ title: "تم تفعيل البوت مجدداً" });
    },
  });

  const handleSend = () => {
    if (!selectedConv || !replyText.trim()) return;
    if (selectedConv.platform === "whatsapp") {
      sendWhatsAppMutation.mutate({ leadId: selectedConv.leadId, message: replyText.trim() });
    } else {
      sendSocialMutation.mutate({
        leadId: selectedConv.leadId,
        messageText: replyText.trim(),
        platform: selectedConv.platform,
      });
    }
  };

  const isSending = sendSocialMutation.isPending || sendWhatsAppMutation.isPending;
  const isLoading = waLoading || socialLoading;
  const botActive = leadInfo?.botActive ?? true;
  const botStage = leadInfo?.botStage ?? "greeting";

  const filtered = unified.filter(c => {
    if (activeTab !== "all" && c.platform !== activeTab) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (c.leadName?.toLowerCase().includes(s)) ||
      c.identifier.includes(s) ||
      (c.lastMessage?.toLowerCase().includes(s))
    );
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: unified.length },
    { key: "whatsapp", label: "واتساب", count: unified.filter(c => c.platform === "whatsapp").length },
    { key: "messenger", label: "ماسنجر", count: unified.filter(c => c.platform === "messenger").length },
    { key: "instagram", label: "إنستجرام", count: unified.filter(c => c.platform === "instagram").length },
  ];

  const getBotBadge = () => {
    if (!botActive || botStage === "handed_off") {
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">يدوي</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">بوت نشط</Badge>;
  };

  const handleSelectConv = (conv: UnifiedConversation) => {
    setSelectedConv(conv);
    if (conv.platform === "whatsapp") {
      apiRequest("POST", `/api/whatsapp/inbox/${conv.leadId}/mark-read`).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
      }).catch(() => {});
    } else {
      apiRequest("POST", `/api/leads/${conv.leadId}/social-messages/read`, { platform: conv.platform }).catch(() => {});
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="page-conversations">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">صندوق المحادثات</h1>
        <p className="text-muted-foreground">جميع المحادثات عبر واتساب وماسنجر وإنستجرام</p>
      </div>

      <div className="flex gap-1 mb-4 border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{tab.count}</span>
            )}
          </button>
        ))}
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
              {filtered.map(conv => (
                <button
                  key={`${conv.platform}-${conv.leadId}`}
                  onClick={() => handleSelectConv(conv)}
                  data-testid={`conv-item-${conv.leadId}`}
                  className={cn(
                    "w-full text-start px-3 py-3 border-b hover:bg-muted/50 transition-colors",
                    selectedConv?.leadId === conv.leadId && selectedConv?.platform === conv.platform && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                      {PLATFORM_ICON[conv.platform] ?? <MessageSquare className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{conv.leadName || conv.identifier}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), "HH:mm") : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage ?? "لا توجد رسائل"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground">{PLATFORM_LABEL[conv.platform] || conv.platform}</span>
                        {conv.unreadCount > 0 && (
                          <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {conv.unreadCount}
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
          {!selectedConv ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground flex-col gap-2">
              <MessageSquare className="h-12 w-12" />
              <p>اختر محادثة للعرض</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card shrink-0">
                  <div className="flex items-center gap-2">
                    {PLATFORM_ICON[selectedConv.platform] ?? <MessageSquare className="h-4 w-4" />}
                    <span className="font-semibold">{selectedConv.leadName || selectedConv.identifier}</span>
                    <Badge variant="outline" className="text-xs">{PLATFORM_LABEL[selectedConv.platform]}</Badge>
                    {getBotBadge()}
                  </div>
                  <div className="flex items-center gap-2">
                    {botActive && botStage !== "handed_off" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedConv && takeoverMutation.mutate(selectedConv.leadId)}
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
                        onClick={() => selectedConv && reactivateMutation.mutate(selectedConv.leadId)}
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
                        if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!replyText.trim() || isSending}
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
                      <p className="font-medium">{leadInfo?.name ?? selectedConv.leadName ?? "غير معروف"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">{selectedConv.platform === "whatsapp" ? "الهاتف" : "المعرّف"}</p>
                      <p className="font-medium">{selectedConv.identifier}</p>
                      {selectedConv.phone2 && <p className="text-xs text-muted-foreground">{selectedConv.phone2}</p>}
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
                    <p>المنصة: {PLATFORM_LABEL[selectedConv.platform]}</p>
                    <p>الرسائل: {selectedConv.totalCount}</p>
                    <p>غير مقروءة: {selectedConv.unreadCount}</p>
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
