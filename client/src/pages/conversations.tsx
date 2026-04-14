import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Phone, User } from "lucide-react";
import { SiFacebook, SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "messenger" | "whatsapp" | "pending";

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  messenger: <SiFacebook className="h-4 w-4 text-[#1877F2]" />,
  whatsapp: <SiWhatsapp className="h-4 w-4 text-[#25D366]" />,
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function ConversationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [botOff, setBotOff] = useState<Record<string, boolean>>({});

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedId, "messages"],
    enabled: !!selectedId,
  });

  const selected = conversations.find(c => c.id === selectedId) ?? null;

  const updateConvMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Conversation> }) =>
      apiRequest("PATCH", `/api/conversations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiRequest("POST", `/api/conversations/${id}/messages`, { role: "agent", content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedId, "messages"] });
      setReplyText("");
      toast({ title: "Message sent" });
    },
    onError: () => toast({ title: "Failed to send", variant: "destructive" }),
  });

  const filtered = conversations.filter(c => {
    if (activeTab === "messenger") return c.platform === "messenger";
    if (activeTab === "whatsapp") return c.platform === "whatsapp";
    if (activeTab === "pending") return c.status === "pending";
    return true;
  });

  const isBotOff = (id: string) => !!botOff[id];

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: conversations.length },
    { key: "messenger", label: "Messenger", count: conversations.filter(c => c.platform === "messenger").length },
    { key: "whatsapp", label: "WhatsApp", count: conversations.filter(c => c.platform === "whatsapp").length },
    { key: "pending", label: "Needs Attention", count: conversations.filter(c => c.status === "pending").length },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="page-conversations">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Conversations Inbox</h1>
        <p className="text-muted-foreground">All chatbot conversations across channels</p>
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 gap-0 border rounded-lg overflow-hidden">
        <div className="w-72 shrink-0 border-r flex flex-col overflow-hidden bg-muted/20">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-4">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">No conversations</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filtered.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  data-testid={`conv-item-${conv.id}`}
                  className={cn(
                    "w-full text-start px-3 py-3 border-b hover:bg-muted/50 transition-colors",
                    selectedId === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                      {PLATFORM_ICON[conv.platform] ?? <MessageSquare className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{conv.contactName ?? "Anonymous"}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {conv.updatedAt ? format(new Date(conv.updatedAt), "HH:mm") : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{conv.platform}</span>
                        {conv.status === "pending" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                        )}
                      </div>
                      {isBotOff(conv.id) && (
                        <span className="text-xs text-orange-500">Manual mode</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 min-w-0 min-h-0">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground flex-col gap-2">
              <MessageSquare className="h-12 w-12" />
              <p>Select a conversation to view</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card shrink-0">
                  <div className="flex items-center gap-2">
                    {PLATFORM_ICON[selected.platform] ?? <MessageSquare className="h-4 w-4" />}
                    <span className="font-semibold">{selected.contactName ?? "Anonymous"}</span>
                    <Badge className={STATUS_COLORS[selected.status] ?? ""}>{selected.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`bot-toggle-${selected.id}`} className="text-sm text-muted-foreground">
                      {isBotOff(selected.id) ? "Manual mode" : "Bot handling"}
                    </Label>
                    <Switch
                      id={`bot-toggle-${selected.id}`}
                      checked={!isBotOff(selected.id)}
                      onCheckedChange={checked => setBotOff(prev => ({ ...prev, [selected.id]: !checked }))}
                      data-testid={`switch-bot-${selected.id}`}
                    />
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
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={cn("flex", msg.role === "user" ? "justify-start" : "justify-end")}
                        data-testid={`message-${msg.id}`}
                      >
                        <div
                          className={cn(
                            "max-w-xs rounded-xl px-3 py-2 text-sm",
                            msg.role === "user"
                              ? "bg-muted text-foreground"
                              : msg.role === "agent"
                              ? "bg-orange-500 text-white"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          <p>{msg.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : ""}
                            {msg.role !== "user" && (
                              <span className="ml-1">{msg.role === "agent" ? "· Agent" : "· Bot"}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isBotOff(selected.id) && (
                  <div className="border-t p-3 bg-card shrink-0">
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        data-testid="input-manual-reply"
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                            sendMessageMutation.mutate({ id: selected.id, content: replyText.trim() });
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => replyText.trim() && sendMessageMutation.mutate({ id: selected.id, content: replyText.trim() })}
                        disabled={!replyText.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-reply"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-64 shrink-0 border-l p-4 overflow-y-auto bg-muted/10">
                <h3 className="font-semibold text-sm mb-3">Contact Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Name</p>
                      <p className="font-medium">{selected.contactName ?? "Unknown"}</p>
                    </div>
                  </div>
                  {selected.contactPhone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Phone</p>
                        <p className="font-medium">{selected.contactPhone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Platform</p>
                      <p className="font-medium capitalize">{selected.platform}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Status</p>
                    <Badge className={STATUS_COLORS[selected.status] ?? ""}>{selected.status}</Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-xs mb-2">Update Status</p>
                    <div className="flex flex-col gap-1">
                      {(["open", "pending", "closed"] as const).map(s => (
                        <Button
                          key={s}
                          size="sm"
                          variant={selected.status === s ? "default" : "outline"}
                          className="justify-start capitalize"
                          onClick={() => updateConvMutation.mutate({ id: selected.id, data: { status: s } })}
                          data-testid={`button-status-${s}`}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <p>Started: {selected.createdAt ? format(new Date(selected.createdAt), "MMM d, yyyy") : "—"}</p>
                    <p>Updated: {selected.updatedAt ? format(new Date(selected.updatedAt), "MMM d, HH:mm") : "—"}</p>
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
