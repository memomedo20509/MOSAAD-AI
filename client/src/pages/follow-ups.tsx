import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, AlertTriangle, Bell, Phone, ClipboardList } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Lead, Reminder, Task } from "@shared/schema";

type ReminderWithLead = Reminder & { lead: Lead | null };

type MyDayData = {
  todayFollowUps: ReminderWithLead[];
  newLeads: Lead[];
  overdueFollowUps: ReminderWithLead[];
  doneToday: ReminderWithLead[];
};

export default function FollowUpsPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<MyDayData>({
    queryKey: ["/api/my-day"],
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const todayTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return allTasks.filter((t) => {
      if (t.completed) return false;
      const due = t.endDate ? new Date(t.endDate) : t.startDate ? new Date(t.startDate) : null;
      if (!due) return false;
      return due >= today && due < tomorrow;
    });
  }, [allTasks]);

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/reminders/${id}`, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "تم إكمال التذكير" });
    },
    onError: () => toast({ title: "فشل في تحديث التذكير", variant: "destructive" }),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/tasks/${id}`, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-day"] });
      toast({ title: "تم إكمال المهمة" });
    },
    onError: () => toast({ title: "فشل في تحديث المهمة", variant: "destructive" }),
  });

  const todayFollowUps = data?.todayFollowUps ?? [];
  const overdueFollowUps = data?.overdueFollowUps ?? [];
  const doneToday = data?.doneToday ?? [];
  const newLeads = data?.newLeads ?? [];

  return (
    <div className="space-y-6" data-testid="page-follow-ups">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">متابعات اليوم</h1>
        <p className="text-muted-foreground">التذكيرات والمهام المطلوبة اليوم</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-count">{overdueFollowUps.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مطلوبة اليوم</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold text-amber-600" data-testid="text-today-count">{todayFollowUps.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة اليوم</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-done-count">{doneToday.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ليدز جديدة</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold text-blue-600" data-testid="text-new-leads-count">{newLeads.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <>
          {overdueFollowUps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  متابعات متأخرة ({overdueFollowUps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueFollowUps.map((r) => (
                    <ReminderRow key={r.id} reminder={r} onComplete={() => completeMutation.mutate(r.id)} isPending={completeMutation.isPending} variant="overdue" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                متابعات اليوم ({todayFollowUps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayFollowUps.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد متابعات مطلوبة اليوم</p>
              ) : (
                <div className="space-y-3">
                  {todayFollowUps.map((r) => (
                    <ReminderRow key={r.id} reminder={r} onComplete={() => completeMutation.mutate(r.id)} isPending={completeMutation.isPending} variant="today" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!tasksLoading && todayTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-indigo-500" />
                  مهام اليوم ({todayTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between gap-4 border rounded-lg p-3 border-l-4 border-l-indigo-500" data-testid={`row-task-${task.id}`}>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-task-due-${task.id}`}>
                          {(task.endDate || task.startDate) ? format(new Date((task.endDate ?? task.startDate)!), "d MMMM yyyy - hh:mm a", { locale: ar }) : "—"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeTaskMutation.mutate(task.id)}
                        disabled={completeTaskMutation.isPending}
                        data-testid={`button-complete-task-${task.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        إكمال
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {doneToday.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  مكتملة اليوم ({doneToday.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doneToday.map((r) => (
                    <ReminderRow key={r.id} reminder={r} variant="done" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ReminderRow({ reminder, onComplete, isPending, variant }: {
  reminder: ReminderWithLead;
  onComplete?: () => void;
  isPending?: boolean;
  variant: "overdue" | "today" | "done";
}) {
  const borderColor = variant === "overdue" ? "border-l-red-500" : variant === "done" ? "border-l-green-500" : "border-l-amber-500";

  return (
    <div className={`flex items-center justify-between gap-4 border rounded-lg p-3 border-l-4 ${borderColor}`} data-testid={`row-reminder-${reminder.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate" data-testid={`text-reminder-title-${reminder.id}`}>{reminder.title}</span>
          {reminder.priority && (
            <Badge variant="outline" className="text-[10px]" data-testid={`badge-priority-${reminder.id}`}>{reminder.priority}</Badge>
          )}
        </div>
        {reminder.lead && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span data-testid={`text-lead-name-${reminder.id}`}>{reminder.lead.name ?? "بدون اسم"}</span>
            {reminder.lead.phone && (
              <span className="flex items-center gap-1" dir="ltr">
                <Phone className="h-3 w-3" />
                {reminder.lead.phone}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-due-date-${reminder.id}`}>
          {reminder.dueDate ? format(new Date(reminder.dueDate), "d MMMM yyyy - hh:mm a", { locale: ar }) : "—"}
        </p>
      </div>
      {variant !== "done" && onComplete && (
        <Button size="sm" variant="outline" onClick={onComplete} disabled={isPending} data-testid={`button-complete-${reminder.id}`}>
          <CheckCircle className="h-4 w-4 mr-1" />
          إكمال
        </Button>
      )}
      {variant === "done" && (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-done-${reminder.id}`}>مكتمل</Badge>
      )}
    </div>
  );
}
