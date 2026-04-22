import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Search, ChevronLeft, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface TicketItem {
  id: string;
  companyId: string | null;
  companyName: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdByName: string | null;
  assignedToName: string | null;
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

export default function PlatformTicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const { t, isRTL } = useLanguage();

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

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (priorityFilter !== "all") queryParams.set("priority", priorityFilter);

  const { data: tickets = [], isLoading } = useQuery<TicketItem[]>({
    queryKey: ["/api/platform/tickets", statusFilter, priorityFilter],
    queryFn: async () => {
      const res = await fetch(`/api/platform/tickets?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filteredTickets = tickets.filter((tkt) =>
    !search || tkt.subject.toLowerCase().includes(search.toLowerCase()) || (tkt.companyName?.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString(isRTL ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.ticketsTitle}</h1>
          <p className="text-muted-foreground">{t.ticketsDesc}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {tickets.filter(tkt => tkt.status === "open").length} {t.ticketsOpenBadge}
          </Badge>
          <Badge className="bg-orange-100 text-orange-700 px-3 py-1">
            {tickets.filter(tkt => tkt.priority === "urgent").length} {t.ticketsUrgentBadge}
          </Badge>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={t.ticketsSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={isRTL ? "pr-9" : "pl-9"}
            data-testid="input-search-tickets"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" data-testid="select-ticket-status">
            <SelectValue placeholder={t.ticketsStatusPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.ticketsAllStatuses}</SelectItem>
            <SelectItem value="open">{t.ticketStatusOpen}</SelectItem>
            <SelectItem value="in_progress">{t.ticketStatusInProgress}</SelectItem>
            <SelectItem value="resolved">{t.ticketStatusResolved}</SelectItem>
            <SelectItem value="closed">{t.ticketStatusClosed}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36" data-testid="select-ticket-priority">
            <SelectValue placeholder={t.ticketsPriorityPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.ticketsAllPriorities}</SelectItem>
            <SelectItem value="urgent">{t.ticketPriorityUrgent}</SelectItem>
            <SelectItem value="high">{t.ticketPriorityHigh}</SelectItem>
            <SelectItem value="medium">{t.ticketPriorityMedium}</SelectItem>
            <SelectItem value="low">{t.ticketPriorityLow}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t.ticketsEmpty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow" data-testid={`card-ticket-${ticket.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{ticket.subject}</h3>
                      {ticket.priority === "urgent" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                        {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                      </Badge>
                      <Badge className={`text-xs ${STATUS_COLORS[ticket.status] ?? ""}`}>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {ticket.companyName && <span>🏢 {ticket.companyName}</span>}
                      {ticket.createdByName && <span>{t.ticketsFrom} {ticket.createdByName}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(ticket.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/platform/tickets/${ticket.id}`}>
                    <Button variant="ghost" size="sm" data-testid={`button-ticket-detail-${ticket.id}`}>
                      {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {t.ticketsOpenBtn}
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
