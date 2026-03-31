import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Send, Facebook, Instagram, Bot, User, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Lead } from "@shared/schema";

interface SocialMessage {
  id: string;
  leadId: string | null;
  platform: string;
  senderId: string;
  direction: string;
  messageText: string | null;
  agentName: string | null;
  isRead: boolean | null;
  botActionsSummary: string | null;
  createdAt: string | null;
}

interface SocialMessagesPanelProps {
  lead: Lead;
  platform: "messenger" | "instagram";
}

export function SocialMessagesPanel({ lead, platform }: SocialMessagesPanelProps) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelLabel = platform === "instagram" ? "إنستجرام" : "ماسنجر";
  const PlatformIcon = platform === "instagram" ? Instagram : Facebook;
  const iconColor = platform === "instagram" ? "text-pink-500" : "text-blue-600";

  const { data: messages = [], isLoading, refetch } = useQuery<SocialMessage[]>({
    queryKey: ["/api/leads", lead.id, "social-messages", platform],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}/social-messages?platform=${platform}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const senderId = lead.phone ?? "";
      const res = await apiRequest("POST", `/api/leads/${lead.id}/social-messages/send`, {
        messageText: text,
        platform,
        senderId,
      });
      return res.json();
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "social-messages", platform] });
      toast({ title: `تم إرسال الرد عبر ${channelLabel}` });
    },
    onError: () => {
      toast({ title: "فشل في إرسال الرسالة", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/leads/${lead.id}/social-messages/read`, { platform });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "social-messages", platform] });
    },
  });

  useEffect(() => {
    const hasUnread = messages.some((m) => m.direction === "inbound" && !m.isRead);
    if (hasUnread) {
      markReadMutation.mutate();
    }
  }, [messages]);

  const handleSend = () => {
    if (!replyText.trim()) return;
    sendMutation.mutate(replyText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-12 w-1/2 ml-auto" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-medium">{channelLabel}</span>
          <Badge variant="outline" className="text-xs">
            {messages.length} رسالة
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          data-testid={`button-refresh-${platform}`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[200px] max-h-[380px] pr-1"
        data-testid={`messages-list-${platform}`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <PlatformIcon className={`h-8 w-8 mb-2 ${iconColor} opacity-40`} />
            <p>لا توجد رسائل {channelLabel} حتى الآن</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isInbound = msg.direction === "inbound";
            const isBot = msg.agentName === "البوت";
            return (
              <div
                key={msg.id}
                className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                data-testid={`message-${platform}-${msg.id}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm space-y-1 ${
                    isInbound
                      ? "bg-muted text-foreground rounded-tl-sm"
                      : isBot
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-tr-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}
                >
                  {!isInbound && (
                    <div className="flex items-center gap-1 text-xs opacity-70 mb-0.5">
                      {isBot ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      <span>{isBot ? "البوت" : (msg.agentName || "المندوب")}</span>
                    </div>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.messageText}</p>
                  {msg.botActionsSummary && (
                    <p className="text-xs opacity-60 mt-1 border-t border-current/20 pt-1">
                      {msg.botActionsSummary}
                    </p>
                  )}
                  {msg.createdAt && (
                    <p className="text-xs opacity-50 text-left">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply box */}
      <div className="border-t pt-3 space-y-2">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`رد عبر ${channelLabel}... (Enter للإرسال)`}
          className="resize-none text-sm min-h-[60px]"
          rows={2}
          data-testid={`input-reply-${platform}`}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!replyText.trim() || sendMutation.isPending}
            data-testid={`button-send-${platform}`}
          >
            {sendMutation.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="mr-1">إرسال</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
