import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, PhoneCall, ExternalLink, Clock, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WhatsappMessagesLog } from "@shared/schema";

type FilterType = "all" | "unread" | "today";

interface Conversation {
  leadId: string;
  leadName: string | null;
  phone: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  totalCount: number;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export default function WhatsAppInboxPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const { data: waStatus } = useQuery<{ status: string }>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: 15000,
  });

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/whatsapp/inbox"],
    refetchInterval: 15000,
    enabled: waStatus?.status === "connected",
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<WhatsappMessagesLog[]>({
    queryKey: ["/api/leads", selectedLeadId, "whatsapp-log"],
    enabled: !!selectedLeadId,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiRequest("POST", `/api/whatsapp/inbox/${leadId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/inbox/unread-count"] });
    },
  });

  useEffect(() => {
    if (!selectedLeadId) return;
    const conv = conversations.find((c) => c.leadId === selectedLeadId);
    if (conv && conv.unreadCount > 0) {
      markReadMutation.mutate(selectedLeadId);
    }
  }, [selectedLeadId]);

  const filteredConversations = conversations.filter((c) => {
    if (filter === "unread" && c.unreadCount === 0) return false;
    if (filter === "today" && !isToday(c.lastMessageAt)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(c.leadName?.toLowerCase().includes(q) || c.phone.includes(q))
      )
        return false;
    }
    return true;
  });

  const selectedConv = conversations.find((c) => c.leadId === selectedLeadId);

  const isConnected = waStatus?.status === "connected";

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold">صندوق بريد واتساب</h1>
      </div>

      {!isConnected ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-3 max-w-sm">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">غير متصل بالواتساب</h2>
            <p className="text-muted-foreground">
              يجب الاتصال بواتساب أولاً لرؤية المحادثات الواردة.
            </p>
            <Button
              variant="default"
              onClick={() => (window.location.href = "/settings/whatsapp")}
              data-testid="button-go-to-whatsapp-settings"
            >
              الذهاب لإعدادات واتساب
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
          {/* Conversations list */}
          <div className="w-80 flex-shrink-0 flex flex-col border rounded-lg overflow-hidden bg-card">
            {/* Filter tabs */}
            <div className="p-3 border-b space-y-2">
              <Input
                placeholder="بحث بالاسم أو الرقم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-inbox-search"
                className="text-sm"
              />
              <div className="flex gap-1">
                {(
                  [
                    { key: "all", label: "الكل" },
                    { key: "unread", label: "غير مقروء" },
                    { key: "today", label: "اليوم" },
                  ] as { key: FilterType; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    data-testid={`button-filter-${key}`}
                    className={cn(
                      "flex-1 text-xs py-1 rounded-md font-medium transition-colors",
                      filter === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  جاري التحميل...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                  <Inbox className="h-8 w-8" />
                  <span>لا توجد محادثات</span>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.leadId}
                    onClick={() => setSelectedLeadId(conv.leadId)}
                    data-testid={`card-conversation-${conv.leadId}`}
                    className={cn(
                      "w-full text-right px-3 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                      selectedLeadId === conv.leadId && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              conv.unreadCount > 0 && "font-bold"
                            )}
                            data-testid={`text-conv-name-${conv.leadId}`}
                          >
                            {conv.leadName || conv.phone}
                          </span>
                        </div>
                        {conv.leadName && (
                          <span className="text-xs text-muted-foreground block truncate">
                            {conv.phone}
                          </span>
                        )}
                        <p
                          className={cn(
                            "text-xs mt-0.5 truncate",
                            conv.unreadCount > 0
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                          data-testid={`text-conv-last-msg-${conv.leadId}`}
                        >
                          {conv.lastMessage || "—"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className="text-[10px] text-muted-foreground whitespace-nowrap"
                          data-testid={`text-conv-time-${conv.leadId}`}
                        >
                          {formatTime(conv.lastMessageAt)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-4 min-w-4 px-1 text-[10px]"
                            data-testid={`badge-unread-${conv.leadId}`}
                          >
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat view */}
          <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card min-w-0">
            {!selectedLeadId ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                  <p className="text-sm">اختر محادثة لعرضها</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div>
                    <p
                      className="font-semibold text-sm"
                      data-testid="text-chat-lead-name"
                    >
                      {selectedConv?.leadName || selectedConv?.phone || "—"}
                    </p>
                    {selectedConv?.leadName && (
                      <p className="text-xs text-muted-foreground">
                        {selectedConv.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedConv?.totalCount} رسالة
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        (window.location.href = `/leads?leadId=${selectedLeadId}`)
                      }
                      data-testid="button-open-lead"
                      className="gap-1 text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                      افتح الليد
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  data-testid="container-chat-messages"
                >
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      جاري التحميل...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      لا توجد رسائل
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isInbound = msg.direction === "inbound";
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isInbound ? "justify-start" : "justify-end"
                          )}
                          data-testid={`msg-bubble-${msg.id}`}
                        >
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                              isInbound
                                ? "bg-muted text-foreground rounded-tr-sm"
                                : "bg-green-600 text-white rounded-tl-sm"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {msg.messageText || "—"}
                            </p>
                            <div
                              className={cn(
                                "flex items-center gap-1 mt-1",
                                isInbound ? "justify-start" : "justify-end"
                              )}
                            >
                              <Clock className="h-2.5 w-2.5 opacity-60" />
                              <span className="text-[10px] opacity-60">
                                {msg.createdAt
                                  ? new Date(msg.createdAt).toLocaleTimeString(
                                      "ar-EG",
                                      { hour: "2-digit", minute: "2-digit" }
                                    )
                                  : ""}
                              </span>
                              {!isInbound && msg.agentName && (
                                <span className="text-[10px] opacity-60">
                                  · {msg.agentName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer note */}
                <div className="px-4 py-2 border-t text-center text-xs text-muted-foreground bg-muted/20">
                  الإرسال متاح من صفحة الليد
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
