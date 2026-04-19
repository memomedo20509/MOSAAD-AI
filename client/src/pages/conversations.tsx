import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Send, Phone, User, Bot, UserCheck, ExternalLink,
  Bell, Filter
} from "lucide-react";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type FilterPlatform = "all" | "whatsapp" | "messenger" | "instagram" | "facebook_comment";
type FilterRead = "all" | "unread" | "read";

interface UnifiedConversation {
  leadId: string;
  leadName: string | null;
  assignedTo: string | null;
  score: string | null;
  platforms: string[];
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  totalCount: number;
  unreadByPlatform: Record<string, number>;
}

interface UnifiedMessage {
  id: string;
  platform: string;
  direction: string;
  messageText: string | null;
  agentName: string | null;
  createdAt: string | null;
  botActionsSummary: string | null;
  isRead: boolean | null;
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
  assignedTo: string | null;
}

interface User {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  messenger: <SiFacebook className="h-3.5 w-3.5 text-[#1877F2]" />,
  instagram: <SiInstagram className="h-3.5 w-3.5 text-[#E4405F]" />,
  whatsapp: <SiWhatsapp className="h-3.5 w-3.5 text-[#25D366]" />,
  facebook_comment: <span className="text-[#1877F2] text-xs font-bold">📢</span>,
};

const PLATFORM_LABEL: Record<string, string> = {
  messenger: "ماسنجر",
  instagram: "إنستجرام",
  whatsapp: "واتساب",
  facebook_comment: "تعليق فيسبوك",
};

const PLATFORM_COLOR: Record<string, string> = {
  whatsapp: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
  messenger: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
  instagram: "bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800",
  facebook_comment: "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800",
};

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border",
      PLATFORM_COLOR[platform] ?? "bg-muted border-border"
    )}>
      {PLATFORM_ICON[platform]}
      <span className="hidden sm:inline">{PLATFORM_LABEL[platform] ?? platform}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: string | null }) {
  if (!score) return null;
  const cfg = {
    hot: { label: "ساخن 🔥", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200" },
    warm: { label: "دافئ", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200" },
    cold: { label: "بارد", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200" },
  }[score] ?? { label: score, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cn("text-xs border", cfg.cls)}>{cfg.label}</Badge>;
}

const REPLY_PLATFORMS = ["whatsapp", "messenger", "instagram"];

function getReplyablePlatforms(platforms: string[]) {
  return platforms.filter(p => REPLY_PLATFORMS.includes(p));
}

export default function ConversationsPage() {
  const { toast } = useToast();
  const [activePlatform, setActivePlatform] = useState<FilterPlatform>("all");
  const [filterRead, setFilterRead] = useState<FilterRead>("all");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPlatform, setReplyPlatform] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<UnifiedConversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 15000,
  });

  const selectedConv = conversations.find(c => c.leadId === selectedLeadId) ?? null;

  const { data: messages = [], isLoading: messagesLoading } = useQuery<UnifiedMessage[]>({
    queryKey: ["/api/conversations", selectedLeadId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${selectedLeadId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedLeadId,
    refetchInterval: 8000,
  });

  const { data: leadInfo } = useQuery<LeadInfo>({
    queryKey: ["/api/leads", selectedLeadId],
    enabled: !!selectedLeadId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedConv) {
      const replyable = getReplyablePlatforms(selectedConv.platforms);
      if (replyable.length === 1) {
        setReplyPlatform(replyable[0]);
      } else if (replyable.length > 1) {
        const lastMsg = messages[messages.length - 1];
        const lastReplyable = lastMsg && REPLY_PLATFORMS.includes(lastMsg.platform)
          ? lastMsg.platform
          : replyable[0];
        setReplyPlatform(lastReplyable);
      }
    }
  }, [selectedLeadId, selectedConv?.platforms.join(","), messages.length]);

  const sendSocialMutation = useMutation({
    mutationFn: ({ leadId, messageText, platform }: { leadId: string; messageText: string; platform: string }) =>
      apiRequest("POST", `/api/leads/${leadId}/social-messages/send`, { messageText, platform }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedLeadId, "messages"] });
      setReplyText("");
      toast({ title: "تم إرسال الرسالة" });
    },
    onError: () => toast({ title: "فشل الإرسال", variant: "destructive" }),
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: ({ leadId, message }: { leadId: string; message: string }) =>
      apiRequest("POST", "/api/whatsapp/send", { leadId, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedLeadId, "messages"] });
      setReplyText("");
    },
    onError: () => toast({ title: "فشل إرسال الرسالة", variant: "destructive" }),
  });

  const takeoverMutation = useMutation({
    mutationFn: (leadId: string) => apiRequest("POST", `/api/leads/${leadId}/bot/takeover`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId] });
      toast({ title: "تم تسلّم المحادثة من البوت" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (leadId: string) => apiRequest("POST", `/api/leads/${leadId}/bot/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId] });
      toast({ title: "تم تفعيل البوت مجدداً" });
    },
  });

  const logCallMutation = useMutation({
    mutationFn: (leadId: string) => apiRequest("POST", "/api/call-logs", { leadId, outcome: "answered", notes: "مكالمة من صندوق المحادثات" }),
    onSuccess: () => toast({ title: "تم تسجيل المكالمة" }),
    onError: () => toast({ title: "فشل تسجيل المكالمة", variant: "destructive" }),
  });

  const createReminderMutation = useMutation({
    mutationFn: ({ leadId, title, dueDate }: { leadId: string; title: string; dueDate: string }) =>
      apiRequest("POST", "/api/reminders", { leadId, title, dueDate, priority: "medium", isCompleted: false }),
    onSuccess: () => {
      setShowReminderDialog(false);
      setReminderTitle("");
      setReminderDate("");
      toast({ title: "تم إضافة التذكير" });
    },
    onError: () => toast({ title: "فشل إضافة التذكير", variant: "destructive" }),
  });

  const handleSend = () => {
    if (!selectedLeadId || !replyText.trim() || !replyPlatform) return;
    if (replyPlatform === "whatsapp") {
      sendWhatsAppMutation.mutate({ leadId: selectedLeadId, message: replyText.trim() });
    } else {
      sendSocialMutation.mutate({ leadId: selectedLeadId, messageText: replyText.trim(), platform: replyPlatform });
    }
  };

  const handleSelectConv = (conv: UnifiedConversation) => {
    setSelectedLeadId(conv.leadId);
    setReplyText("");
    if (conv.platforms.includes("whatsapp")) {
      apiRequest("POST", `/api/whatsapp/inbox/${conv.leadId}/mark-read`).catch(() => {});
    }
    const socialPlatforms = new Set<string>();
    for (const p of conv.platforms) {
      if (p === "messenger" || p === "instagram") socialPlatforms.add(p);
      if (p === "facebook_comment") {
        socialPlatforms.add("messenger");
        socialPlatforms.add("instagram");
      }
    }
    for (const p of socialPlatforms) {
      apiRequest("POST", `/api/leads/${conv.leadId}/social-messages/read`, { platform: p }).catch(() => {});
    }
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
  };

  const isSending = sendSocialMutation.isPending || sendWhatsAppMutation.isPending;
  const botActive = leadInfo?.botActive ?? true;
  const botStage = leadInfo?.botStage ?? "greeting";

  const unreadByPlatform = conversations.reduce((acc, c) => {
    for (const [p, cnt] of Object.entries(c.unreadByPlatform ?? {})) {
      acc[p] = (acc[p] ?? 0) + cnt;
    }
    return acc;
  }, {} as Record<string, number>);

  const filtered = conversations.filter(c => {
    if (activePlatform !== "all" && !c.platforms.includes(activePlatform)) return false;
    if (filterRead === "unread" && c.unreadCount === 0) return false;
    if (filterRead === "read" && c.unreadCount > 0) return false;
    if (filterAgent !== "all") {
      const matchByUsername = c.assignedTo === filterAgent;
      const matchById = users.find(u => u.username === filterAgent)?.id === c.assignedTo;
      if (!matchByUsername && !matchById) return false;
    }
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (c.leadName?.toLowerCase().includes(s)) || (c.lastMessage?.toLowerCase().includes(s));
  });

  const tabs: { key: FilterPlatform; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "whatsapp", label: "واتساب" },
    { key: "messenger", label: "ماسنجر" },
    { key: "instagram", label: "إنستجرام" },
    { key: "facebook_comment", label: "تعليقات" },
  ];

  const replyablePlatforms = selectedConv ? getReplyablePlatforms(selectedConv.platforms) : [];

  const getUserDisplayName = (usernameOrId: string | null) => {
    if (!usernameOrId) return null;
    const u = users.find(u => u.id === usernameOrId || u.username === usernameOrId);
    if (!u) return usernameOrId;
    return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.username;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="page-conversations">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">صندوق المحادثات</h1>
          <p className="text-muted-foreground text-sm">جميع المحادثات عبر واتساب وماسنجر وإنستجرام والتعليقات</p>
        </div>
      </div>

      <div className="flex gap-1 mb-3 border-b overflow-x-auto shrink-0">
        {tabs.map(tab => {
          const cnt = tab.key === "all"
            ? conversations.length
            : conversations.filter(c => c.platforms.includes(tab.key)).length;
          const unread = tab.key === "all"
            ? Object.values(unreadByPlatform).reduce((a, b) => a + b, 0)
            : (unreadByPlatform[tab.key] ?? 0);
          return (
            <button
              key={tab.key}
              onClick={() => setActivePlatform(tab.key)}
              data-testid={`tab-${tab.key}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                activePlatform === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.key !== "all" && PLATFORM_ICON[tab.key]}
              {tab.label}
              {cnt > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{cnt}</span>
              )}
              {unread > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs font-bold">{unread}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 min-h-0 gap-0 border rounded-lg overflow-hidden">
        <div className="w-80 shrink-0 border-r flex flex-col overflow-hidden bg-muted/20">
          <div className="p-2 border-b space-y-2">
            <Input
              placeholder="بحث بالاسم أو الرسالة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid="input-search-conversations"
              className="h-8 text-sm"
            />
            <div className="flex gap-1">
              <Select value={filterRead} onValueChange={v => setFilterRead(v as FilterRead)}>
                <SelectTrigger className="h-7 text-xs flex-1" data-testid="filter-read">
                  <Filter className="h-3 w-3 ml-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="unread">غير مقروء</SelectItem>
                  <SelectItem value="read">مقروء</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger className="h-7 text-xs flex-1" data-testid="filter-agent">
                  <SelectValue placeholder="المندوب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المندوبين</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.username}>
                      {u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                  key={conv.leadId}
                  onClick={() => handleSelectConv(conv)}
                  data-testid={`conv-item-${conv.leadId}`}
                  className={cn(
                    "w-full text-start px-3 py-3 border-b hover:bg-muted/50 transition-colors",
                    selectedLeadId === conv.leadId && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5 relative">
                      <User className="h-4 w-4 text-primary" />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{conv.leadName || "عميل غير معروف"}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), "HH:mm") : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage ?? "لا توجد رسائل"}
                      </p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {conv.platforms.map(p => (
                          <span key={p} title={PLATFORM_LABEL[p] ?? p}>
                            {PLATFORM_ICON[p]}
                          </span>
                        ))}
                        {conv.score && <ScoreBadge score={conv.score} />}
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
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-card shrink-0 flex-wrap gap-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{selectedConv.leadName || "عميل"}</span>
                    <ScoreBadge score={selectedConv.score} />
                    {selectedConv.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                    {selectedConv.assignedTo && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="h-3 w-3" />
                        {getUserDisplayName(selectedConv.assignedTo)}
                      </Badge>
                    )}
                    {botActive && botStage !== "handed_off"
                      ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">بوت نشط</Badge>
                      : <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs">يدوي</Badge>
                    }
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => logCallMutation.mutate(selectedLeadId!)}
                      disabled={logCallMutation.isPending}
                      data-testid="button-log-call"
                    >
                      <Phone className="h-3 w-3" />
                      تسجيل مكالمة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setShowReminderDialog(true)}
                      data-testid="button-add-reminder"
                    >
                      <Bell className="h-3 w-3" />
                      تذكير
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      asChild
                      data-testid="button-view-lead"
                    >
                      <Link href="/leads">
                        <ExternalLink className="h-3 w-3" />
                        ملف العميل
                      </Link>
                    </Button>
                    {botActive && botStage !== "handed_off" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => takeoverMutation.mutate(selectedLeadId!)}
                        disabled={takeoverMutation.isPending}
                        data-testid="button-takeover"
                      >
                        <UserCheck className="h-3 w-3" />
                        تسلّم
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => reactivateMutation.mutate(selectedLeadId!)}
                        disabled={reactivateMutation.isPending}
                        data-testid="button-reactivate-bot"
                      >
                        <Bot className="h-3 w-3" />
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
                        const isInbound = msg.direction === "inbound" || msg.direction === "comment_reply";
                        const isBot = msg.agentName === "البوت";
                        return (
                          <div
                            key={msg.id}
                            className={cn("flex flex-col gap-0.5", isInbound ? "items-start" : "items-end")}
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
                              <p className="whitespace-pre-wrap break-words">{msg.messageText}</p>
                              {msg.botActionsSummary && (
                                <p className="text-xs mt-1 opacity-70 border-t border-white/20 pt-1">
                                  {msg.botActionsSummary}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1 opacity-70 text-xs">
                                <span className="inline-flex items-center gap-0.5">
                                  {PLATFORM_ICON[msg.platform]}
                                  {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                                </span>
                                {!isInbound && (
                                  <span>· {isBot ? "بوت" : msg.agentName || "مندوب"}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <div className="border-t p-3 bg-card shrink-0">
                  {replyablePlatforms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-1">
                      هذا العميل تواصل عبر تعليقات فقط — لا يمكن إرسال رسائل مباشرة من هنا
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {replyablePlatforms.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">إرسال عبر:</span>
                          <div className="flex gap-1">
                            {replyablePlatforms.map(p => (
                              <button
                                key={p}
                                onClick={() => setReplyPlatform(p)}
                                data-testid={`channel-picker-${p}`}
                                className={cn(
                                  "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors",
                                  replyPlatform === p
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "border-border hover:bg-muted"
                                )}
                              >
                                {PLATFORM_ICON[p]}
                                {PLATFORM_LABEL[p]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={`اكتب رسالتك عبر ${PLATFORM_LABEL[replyPlatform ?? "whatsapp"] ?? ""}...`}
                          data-testid="input-reply"
                          dir="rtl"
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={handleSend}
                          disabled={!replyText.trim() || isSending || !replyPlatform}
                          data-testid="button-send-reply"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-56 shrink-0 border-l p-4 overflow-y-auto bg-muted/10 hidden lg:block">
                <h3 className="font-semibold text-sm mb-3">بيانات العميل</h3>
                <div className="space-y-3 text-sm" dir="rtl">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">الاسم</p>
                      <p className="font-medium">{leadInfo?.name ?? selectedConv.leadName ?? "غير معروف"}</p>
                    </div>
                  </div>
                  {leadInfo?.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">الهاتف</p>
                        <p className="font-medium">{leadInfo.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedConv.score && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">التقييم</p>
                      <ScoreBadge score={selectedConv.score} />
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
                  {selectedConv.assignedTo && (
                    <div>
                      <p className="text-muted-foreground text-xs">المندوب</p>
                      <p className="font-medium">{getUserDisplayName(selectedConv.assignedTo)}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">المنصات</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedConv.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>الرسائل: {selectedConv.totalCount}</p>
                    <p>غير مقروءة: {selectedConv.unreadCount}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تذكير</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>العنوان</Label>
              <Input
                value={reminderTitle}
                onChange={e => setReminderTitle(e.target.value)}
                placeholder="اكتب عنوان التذكير..."
                data-testid="input-reminder-title"
              />
            </div>
            <div>
              <Label>التاريخ والوقت</Label>
              <Input
                type="datetime-local"
                value={reminderDate}
                onChange={e => setReminderDate(e.target.value)}
                data-testid="input-reminder-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>إلغاء</Button>
            <Button
              onClick={() => {
                if (!selectedLeadId || !reminderTitle || !reminderDate) return;
                createReminderMutation.mutate({ leadId: selectedLeadId, title: reminderTitle, dueDate: reminderDate });
              }}
              disabled={createReminderMutation.isPending || !reminderTitle || !reminderDate}
              data-testid="button-save-reminder"
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
