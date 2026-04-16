import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ticket, Clock, Plus, ChevronLeft, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "عالي",
  urgent: "عاجل",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const CATEGORY_OPTIONS = [
  { value: "technical", label: "مشكلة تقنية" },
  { value: "billing", label: "فوترة ومدفوعات" },
  { value: "feature_request", label: "طلب ميزة" },
  { value: "account", label: "إدارة الحساب" },
  { value: "other", label: "أخرى" },
];

export default function SupportTicketsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

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
      toast({ title: "تم إرسال التذكرة", description: "سيتواصل معك فريق الدعم في أقرب وقت" });
      setIsDialogOpen(false);
      setSubject("");
      setCategory("");
      setDescription("");
      setPriority("medium");
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل إرسال التذكرة، حاول مرة أخرى", variant: "destructive" });
    },
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الدعم الفني</h1>
          <p className="text-muted-foreground">تذاكر الدعم وطلبات المساعدة</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-ticket">
              <Plus className="h-4 w-4 ml-2" />
              تذكرة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>إرسال تذكرة دعم جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-category">التصنيف</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="ticket-category" data-testid="select-ticket-category">
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-subject">الموضوع</Label>
                <Input
                  id="ticket-subject"
                  placeholder="وصف موجز للمشكلة"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-ticket-subject"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-priority">الأولوية</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="ticket-priority" data-testid="select-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-description">التفاصيل</Label>
                <Textarea
                  id="ticket-description"
                  placeholder="اشرح المشكلة بالتفصيل..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="textarea-ticket-description"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-ticket">
                  إلغاء
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!subject.trim() || !description.trim() || createMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  {createMutation.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
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
            <p className="text-muted-foreground mb-4">لا توجد تذاكر بعد</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)} data-testid="button-new-ticket-empty">
              <Plus className="h-4 w-4 ml-2" />
              أرسل تذكرتك الأولى
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
                      <ChevronLeft className="h-4 w-4" />
                      عرض
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
