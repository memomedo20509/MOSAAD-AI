import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Building2, CreditCard, AlertTriangle, UserPlus, Wifi, LifeBuoy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlatformNotification {
  id: string;
  type: string;
  message: string;
  companyId: string | null;
  companyName: string | null;
  isRead: boolean | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  new_registration: UserPlus,
  trial_ending: AlertTriangle,
  payment_overdue: CreditCard,
  whatsapp_disconnect: Wifi,
  subscription_cancelled: AlertTriangle,
  plan_upgraded: Building2,
  new_support_ticket: LifeBuoy,
};

const TYPE_LABELS: Record<string, string> = {
  new_registration: "تسجيل جديد",
  trial_ending: "تجربة منتهية",
  payment_overdue: "دفعة متأخرة",
  whatsapp_disconnect: "واتساب منفصل",
  subscription_cancelled: "اشتراك ملغي",
  plan_upgraded: "ترقية الباقة",
  new_support_ticket: "تذكرة دعم جديدة",
};

const TYPE_COLORS: Record<string, string> = {
  new_registration: "text-green-500",
  trial_ending: "text-yellow-500",
  payment_overdue: "text-red-500",
  whatsapp_disconnect: "text-orange-500",
  subscription_cancelled: "text-red-500",
  plan_upgraded: "text-blue-500",
  new_support_ticket: "text-purple-500",
};

export default function PlatformNotificationsPage() {
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<PlatformNotification[]>({
    queryKey: ["/api/platform/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/platform/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/platform/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/notifications/unread-count"] });
      toast({ title: "تم تحديد الكل كمقروء" });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مركز الإشعارات</h1>
          <p className="text-muted-foreground">أحداث المنصة والتنبيهات المهمة</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <Check className="h-4 w-4 ml-1" />
            تحديد الكل كمقروء ({unreadCount})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد إشعارات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] ?? Bell;
            const color = TYPE_COLORS[notif.type] ?? "text-muted-foreground";
            return (
              <Card
                key={notif.id}
                className={`transition-all ${!notif.isRead ? "border-primary/30 bg-primary/5" : ""}`}
                data-testid={`notification-${notif.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[notif.type] ?? notif.type}
                        </Badge>
                        {!notif.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm mt-1">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {notif.companyName && <span>🏢 {notif.companyName}</span>}
                        <span>{formatDate(notif.createdAt)}</span>
                      </div>
                    </div>
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-8 w-8 p-0"
                        onClick={() => markReadMutation.mutate(notif.id)}
                        data-testid={`button-read-notification-${notif.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
