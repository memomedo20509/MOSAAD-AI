import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ticket, Clock, Plus, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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

export default function SupportTicketsPage() {
  const { t, isRTL, language } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

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

  const CATEGORY_OPTIONS = [
    { value: "technical", label: t.ticketCategoryTech },
    { value: "billing", label: t.ticketCategoryBilling },
    { value: "feature_request", label: t.ticketCategoryFeature },
    { value: "account", label: t.ticketCategoryAccount },
    { value: "other", label: t.ticketCategoryOther },
  ];

  const { data: tickets = [], isLoading } = useQuery<TicketItem[]>({
    queryKey: ["/api/company/tickets"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/company/tickets", {
        subject: category ? `[${CATEGORY_OPTIONS.find(c => c.value === category)?.label ?? category}] ${subject}` : subject,
        description,
        priority,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/tickets"] });
      toast({ title: t.ticketSuccessTitle, description: t.ticketSuccessDesc });
      setIsDialogOpen(false);
      setSubject("");
      setCategory("");
      setDescription("");
      setPriority("medium");
    },
    onError: () => {
      toast({ title: t.ticketErrTitle, description: t.ticketErrDesc, variant: "destructive" });
    },
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" });

  const ViewIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.supportTechTitle}</h1>
          <p className="text-muted-foreground">{t.supportTechDesc}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-ticket">
              <Plus className={`h-4 w-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t.ticketNewBtn}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t.ticketDialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-category">{t.ticketCategoryLabel}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="ticket-category" data-testid="select-ticket-category">
                    <SelectValue placeholder={t.ticketCategoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-subject">{t.ticketSubjectLabel}</Label>
                <Input
                  id="ticket-subject"
                  placeholder={t.ticketSubjectPlaceholder}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-ticket-subject"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-priority">{t.ticketPriorityLabel}</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="ticket-priority" data-testid="select-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t.ticketPriorityLow}</SelectItem>
                    <SelectItem value="medium">{t.ticketPriorityMedium}</SelectItem>
                    <SelectItem value="high">{t.ticketPriorityHigh}</SelectItem>
                    <SelectItem value="urgent">{t.ticketPriorityUrgent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-description">{t.ticketDescLabel}</Label>
                <Textarea
                  id="ticket-description"
                  placeholder={t.ticketDescPlaceholder}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="textarea-ticket-description"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-ticket">
                  {t.ticketCancelBtn}
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!subject.trim() || !description.trim() || createMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  {createMutation.isPending ? t.ticketSubmitting : t.ticketSubmitBtn}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">{t.ticketEmptyMsg}</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)} data-testid="button-new-ticket-empty">
              <Plus className={`h-4 w-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t.ticketFirstBtn}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="hover:shadow-md transition-shadow"
              data-testid={`card-ticket-${ticket.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      {ticket.priority === "urgent" && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                        {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                      </Badge>
                      <Badge className={`text-xs ${STATUS_COLORS[ticket.status] ?? ""}`}>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(ticket.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/support/tickets/${ticket.id}`}>
                    <Button variant="ghost" size="sm" data-testid={`button-view-ticket-${ticket.id}`}>
                      <ViewIcon className="h-4 w-4" />
                      {t.ticketViewBtn}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
