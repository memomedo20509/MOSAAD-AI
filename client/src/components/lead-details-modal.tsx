import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import {
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle,
  Plus,
  Bell,
  Activity,
  Home,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import type { Lead, LeadState, LeadHistory, Task, Reminder, LeadUnitInterest, Unit, Project } from "@shared/schema";

interface LeadDetailsModalProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadDetailsModal({ leadId, isOpen, onClose }: LeadDetailsModalProps) {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDate, setNewReminderDate] = useState("");

  const { data: lead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId,
  });

  const { data: states = [] } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const { data: history = [] } = useQuery<LeadHistory[]>({
    queryKey: ["/api/leads", leadId, "history"],
    enabled: !!leadId,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/leads", leadId, "tasks"],
    enabled: !!leadId,
  });

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/leads", leadId, "reminders"],
    enabled: !!leadId,
  });

  const { data: interests = [] } = useQuery<LeadUnitInterest[]>({
    queryKey: ["/api/leads", leadId, "unit-interests"],
    enabled: !!leadId,
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createReminderMutation = useMutation({
    mutationFn: (data: { title: string; dueDate: string; leadId: string }) =>
      apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setNewReminderTitle("");
      setNewReminderDate("");
      toast({ title: t.reminderCreated });
    },
  });

  const completeReminderMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/reminders/${id}`, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t.reminderCompleted });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "tasks"] });
    },
  });

  const handleAddReminder = () => {
    if (!newReminderTitle || !newReminderDate || !leadId) return;
    createReminderMutation.mutate({
      title: newReminderTitle,
      dueDate: newReminderDate,
      leadId,
    });
  };

  const currentState = states.find((s) => s.id === lead?.stateId);

  const getUnitDetails = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    const project = unit ? projects.find((p) => p.id === unit.projectId) : null;
    return { unit, project };
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">{lead.name || t.noName}</span>
              {currentState && (
                <Badge
                  className="mx-2"
                  style={{ backgroundColor: currentState.color, color: "white" }}
                >
                  {currentState.name}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="h-4 w-4 mr-1" />
              {t.overview}
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              <Activity className="h-4 w-4 mr-1" />
              {t.timeline}
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminders">
              <Bell className="h-4 w-4 mr-1" />
              {t.reminders}
            </TabsTrigger>
            <TabsTrigger value="units" data-testid="tab-units">
              <Home className="h-4 w-4 mr-1" />
              {t.interestedUnits}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.contactInfo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{lead.phone}</span>
                    </div>
                  )}
                  {lead.phone2 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{lead.phone2}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.propertyInfo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.unitType && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.unitType}</span>
                    </div>
                  )}
                  {lead.budget && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.budget}</span>
                    </div>
                  )}
                  {lead.bedrooms && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{t.bedrooms}:</span>
                      <span>{lead.bedrooms}</span>
                    </div>
                  )}
                  {lead.space && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{t.space}:</span>
                      <span>{lead.space} m²</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.additionalInfo}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  {lead.channel && (
                    <div>
                      <span className="text-muted-foreground">{t.channel}: </span>
                      <Badge variant="outline">{lead.channel}</Badge>
                    </div>
                  )}
                  {lead.campaign && (
                    <div>
                      <span className="text-muted-foreground">{t.campaign}: </span>
                      <span>{lead.campaign}</span>
                    </div>
                  )}
                  {lead.assignedTo && (
                    <div>
                      <span className="text-muted-foreground">{t.assignedTo}: </span>
                      <span>{lead.assignedTo}</span>
                    </div>
                  )}
                  {lead.paymentType && (
                    <div>
                      <span className="text-muted-foreground">{t.paymentType}: </span>
                      <span>{lead.paymentType}</span>
                    </div>
                  )}
                  {lead.createdAt && (
                    <div>
                      <span className="text-muted-foreground">{t.createdAt}: </span>
                      <span>{format(new Date(lead.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                  )}
                </div>
                {lead.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">{t.notes}:</p>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {tasks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.tasks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => completeTaskMutation.mutate(task.id)}
                            disabled={task.completed ?? false}
                          >
                            <CheckCircle
                              className={`h-4 w-4 ${task.completed ? "text-green-500" : "text-muted-foreground"}`}
                            />
                          </Button>
                          <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                            {task.title}
                          </span>
                        </div>
                        {task.endDate && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.endDate), "MMM dd")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {history.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {history
                        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                        .map((item) => (
                          <div key={item.id} className="relative pl-10">
                            <div className="absolute left-2 top-1 w-4 h-4 rounded-full bg-primary" />
                            <div className="p-3 rounded-md border">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{item.action}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.createdAt && format(new Date(item.createdAt), "MMM dd, HH:mm")}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                              {item.performedBy && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t.performedBy}: {item.performedBy}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    {t.noDataToDisplay}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.addReminder}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder={t.reminderTitle}
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    className="flex-1"
                    data-testid="input-reminder-title"
                  />
                  <Input
                    type="datetime-local"
                    value={newReminderDate}
                    onChange={(e) => setNewReminderDate(e.target.value)}
                    className="w-48"
                    data-testid="input-reminder-date"
                  />
                  <Button
                    onClick={handleAddReminder}
                    disabled={!newReminderTitle || !newReminderDate}
                    data-testid="button-add-reminder"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.addReminder}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {reminders.length > 0 ? (
                  <div className="space-y-2">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          reminder.isCompleted ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => completeReminderMutation.mutate(reminder.id)}
                            disabled={reminder.isCompleted ?? false}
                          >
                            <CheckCircle
                              className={`h-5 w-5 ${reminder.isCompleted ? "text-green-500" : "text-muted-foreground"}`}
                            />
                          </Button>
                          <div>
                            <p className={reminder.isCompleted ? "line-through" : "font-medium"}>
                              {reminder.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reminder.dueDate && format(new Date(reminder.dueDate), "MMM dd, HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={reminder.isCompleted ? "secondary" : "default"}>
                          {reminder.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    {t.noReminders}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {interests.length > 0 ? (
                  <div className="space-y-3">
                    {interests.map((interest) => {
                      const { unit, project } = getUnitDetails(interest.unitId);
                      if (!unit) return null;
                      return (
                        <div
                          key={interest.id}
                          className="flex items-center justify-between p-3 rounded-md border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                              <Home className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{project?.name || "Unknown Project"}</p>
                              <p className="text-sm text-muted-foreground">
                                {t.unit} {unit.unitNumber} - {unit.area}m² - {unit.bedrooms} {t.bedrooms}
                              </p>
                            </div>
                          </div>
                          <div className="text-end">
                            <p className="font-bold">
                              {unit.price?.toLocaleString()} {t.currency}
                            </p>
                            <Badge variant={interest.interestLevel === "high" ? "default" : "secondary"}>
                              {interest.interestLevel}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    {t.noDataToDisplay}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
