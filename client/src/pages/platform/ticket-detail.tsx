import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MessageSquare, Lock, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface TicketDetail {
  id: string;
  companyName: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdByName: string | null;
  assignedToName: string | null;
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

const STATUS_OPTIONS = [
  { value: "open", label: "مفتوح" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ["/api/platform/tickets", id],
    queryFn: async () => {
      const res = await fetch(`/api/platform/tickets/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/platform/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tickets"] });
      toast({ title: "تم تحديث حالة التذكرة" });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/platform/tickets/${id}/replies`, {
        content: replyContent,
        isInternal,
        userId: user?.id,
        userName: user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.username,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tickets", id] });
      setReplyContent("");
      toast({ title: "تم إرسال الرد" });
    },
    onError: () => toast({ title: "فشل الإرسال", variant: "destructive" }),
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!ticket) return <div className="text-center py-20 text-muted-foreground">التذكرة غير موجودة</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/platform/tickets" className="hover:text-foreground flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          التذاكر
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{ticket.subject}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                <Badge className={`${PRIORITY_COLORS[ticket.priority] ?? ""} flex-shrink-0`}>
                  {ticket.priority}
                </Badge>
              </div>
              {ticket.companyName && (
                <p className="text-sm text-muted-foreground">🏢 {ticket.companyName}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3">{ticket.description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                أنشأ بواسطة: {ticket.createdByName ?? "—"} • {formatDate(ticket.createdAt)}
              </p>
            </CardContent>
          </Card>

          {/* Replies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                الردود ({ticket.replies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.replies.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">لا توجد ردود بعد</p>
              ) : (
                ticket.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-3 rounded-lg ${reply.isInternal ? "bg-yellow-50 border border-yellow-200" : "bg-muted/40"}`}
                    data-testid={`reply-${reply.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{reply.userName ?? "—"}</span>
                      <div className="flex items-center gap-2">
                        {reply.isInternal && (
                          <span className="text-xs flex items-center gap-1 text-yellow-600">
                            <Lock className="h-3 w-3" />
                            داخلي
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                  </div>
                ))
              )}

              {/* Reply Form */}
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  placeholder="اكتب ردك هنا..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  data-testid="textarea-reply"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={isInternal} onCheckedChange={setIsInternal} data-testid="switch-internal-reply" />
                    <Label className="text-sm">رد داخلي (لن يراه العميل)</Label>
                  </div>
                  <Button
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    <Send className="h-4 w-4 ml-1" />
                    إرسال
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">إجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">تغيير الحالة</Label>
                <Select value={ticket.status} onValueChange={(v) => updateStatusMutation.mutate(v)}>
                  <SelectTrigger data-testid="select-ticket-status-update">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">محال إلى</Label>
                <p className="text-sm mt-0.5">{ticket.assignedToName ?? "غير محال"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">آخر تحديث</Label>
                <p className="text-sm mt-0.5">{formatDate(ticket.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
