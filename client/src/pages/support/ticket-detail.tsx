import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ArrowLeft, MessageSquare, Send, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";

interface TicketDetail {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  replies: {
    id: string;
    userId: string | null;
    userName: string | null;
    content: string;
    isInternal: boolean | null;
    createdAt: string;
  }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function SupportTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [replyContent, setReplyContent] = useState("");

  const PRIORITY_LABELS: Record<string, string> = {
    low: t.ticketPriorityLow,
    medium: t.ticketPriorityMedium,
    high: t.ticketPriorityHigh,
    urgent: t.ticketPriorityUrgent,
  };

  const STATUS_LABELS: Record<string, string> = {
    open: t.ticketStatusOpen,
    in_progress: t.ticketStatusInProgress,
    resolved: t.ticketStatusResolved,
    closed: t.ticketStatusClosed,
  };

  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ["/api/company/tickets", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/company/tickets/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return res.json();
    },
    enabled: !!params.id,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/company/tickets/${params.id}/replies`, {
        content: replyContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/tickets", params.id] });
      setReplyContent("");
      toast({ title: t.ticketReplySent });
    },
    onError: () => {
      toast({ title: t.ticketErrTitle, description: t.ticketReplyFail, variant: "destructive" });
    },
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(isRTL ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isClosed = ticket?.status === "closed" || ticket?.status === "resolved";
  const currentUserId = user?.id;
  const BackIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2">
        <Link href="/support/tickets">
          <Button variant="ghost" size="sm" data-testid="button-back-to-tickets">
            <BackIcon className={`h-4 w-4 ${isRTL ? "ms-1" : "me-1"}`} />
            {t.ticketBackBtn}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : !ticket ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t.ticketNotFound}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="card-ticket-detail">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                    {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                  </Badge>
                  <Badge className={`text-xs ${STATUS_COLORS[ticket.status] ?? ""}`}>
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(ticket.createdAt)}
                {ticket.createdByName && <span>· {ticket.createdByName}</span>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.ticketConvTitle}
              {ticket.replies.length > 0 && (
                <Badge variant="outline" className="text-xs">{ticket.replies.length}</Badge>
              )}
            </h2>

            {ticket.replies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {t.ticketNoRepliesDesc}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ticket.replies.map((reply) => {
                  const isOwnReply = reply.userId === currentUserId;
                  return (
                    <div
                      key={reply.id}
                      className={`flex ${isOwnReply ? "justify-end" : "justify-start"}`}
                      data-testid={`reply-${reply.id}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 space-y-1 ${
                          isOwnReply
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border"
                        }`}
                      >
                        <div className="text-xs opacity-70 font-medium">
                          {isOwnReply ? t.ticketYouLabel : reply.userName ?? t.ticketSupportTeam}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                        <div className={`text-xs opacity-60 ${isRTL ? "text-right" : "text-left"}`}>
                          {formatDate(reply.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isClosed && (
              <Card data-testid="card-reply-form">
                <CardContent className="p-4 space-y-3">
                  <Textarea
                    placeholder={t.ticketReplyPlaceholder}
                    rows={3}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    data-testid="textarea-reply-content"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => replyMutation.mutate()}
                      disabled={!replyContent.trim() || replyMutation.isPending}
                      data-testid="button-send-reply"
                    >
                      <Send className={`h-4 w-4 ${isRTL ? "ms-2" : "me-2"}`} />
                      {replyMutation.isPending ? t.ticketSending : t.ticketSendBtn}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isClosed && (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  {t.ticketClosedPrefix} {STATUS_LABELS[ticket.status]} {t.ticketClosedNote}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
