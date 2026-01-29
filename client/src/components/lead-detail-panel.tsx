import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  User,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  History,
  ListTodo,
  Plus,
  Trash2,
} from "lucide-react";
import type { Lead, LeadState, Task, LeadHistory } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface LeadDetailPanelProps {
  lead: Lead | null;
  states: LeadState[];
  onClose: () => void;
  onUpdate: (data: Partial<Lead>) => void;
}

export function LeadDetailPanel({
  lead,
  states,
  onClose,
  onUpdate,
}: LeadDetailPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [newTask, setNewTask] = useState({ title: "", type: "", description: "" });
  const { toast } = useToast();

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/leads", lead?.id, "tasks"],
    enabled: !!lead,
  });

  const { data: history, isLoading: historyLoading } = useQuery<LeadHistory[]>({
    queryKey: ["/api/leads", lead?.id, "history"],
    enabled: !!lead,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      return apiRequest("POST", "/api/tasks", { ...task, leadId: lead?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      setNewTask({ title: "", type: "", description: "" });
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
      toast({ title: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead?.id, "tasks"] });
    },
  });

  const handleSave = () => {
    onUpdate(formData);
    setEditMode(false);
    setFormData({});
  };

  const handleEdit = () => {
    setFormData({ ...lead });
    setEditMode(true);
  };

  if (!lead) return null;

  const currentState = states.find((s) => s.id === lead.stateId);

  return (
    <Sheet open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-xl" data-testid="text-lead-detail-name">
                {lead.name || "No Name"}
              </SheetTitle>
              {currentState && (
                <Badge
                  className="mt-2"
                  style={{
                    backgroundColor: currentState.color + "20",
                    color: currentState.color,
                    borderColor: currentState.color + "40",
                  }}
                >
                  {currentState.name}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} data-testid="button-save-lead">
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleEdit} data-testid="button-edit-lead">
                  Edit
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" data-testid="tab-lead-info">
              <FileText className="h-4 w-4 mr-1" />
              Info
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-lead-tasks">
              <ListTodo className="h-4 w-4 mr-1" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-lead-history">
              <History className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-lead-actions">
              <Phone className="h-4 w-4 mr-1" />
              Actions
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="info" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editMode ? (
                    <>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={formData.name || ""}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          data-testid="input-edit-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={formData.phone || ""}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          data-testid="input-edit-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Phone</Label>
                        <Input
                          value={formData.phone2 || ""}
                          onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                          data-testid="input-edit-phone2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={formData.email || ""}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          data-testid="input-edit-email"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.name || "No name provided"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.phone || "No phone provided"}</span>
                      </div>
                      {lead.phone2 && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.phone2}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.email || "No email provided"}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Lead Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editMode ? (
                    <>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.stateId || ""}
                          onValueChange={(v) => setFormData({ ...formData, stateId: v })}
                        >
                          <SelectTrigger data-testid="select-edit-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.id} value={state.id}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Input
                          value={formData.channel || ""}
                          onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                          data-testid="input-edit-channel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Campaign</Label>
                        <Input
                          value={formData.campaign || ""}
                          onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                          data-testid="input-edit-campaign"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assigned To</Label>
                        <Input
                          value={formData.assignedTo || ""}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                          data-testid="input-edit-assigned"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Channel</p>
                        <p className="font-medium">{lead.channel || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Campaign</p>
                        <p className="font-medium">{lead.campaign || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assigned To</p>
                        <p className="font-medium">{lead.assignedTo || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Request Type</p>
                        <p className="font-medium">{lead.requestType || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unit Type</p>
                        <p className="font-medium">{lead.unitType || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Area</p>
                        <p className="font-medium">{lead.area || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p className="font-medium">{lead.budget || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">{lead.location || "-"}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {lead.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}

              {editMode && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      data-testid="textarea-edit-notes"
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add New Task</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    data-testid="input-new-task-title"
                  />
                  <Select
                    value={newTask.type}
                    onValueChange={(v) => setNewTask({ ...newTask, type: v })}
                  >
                    <SelectTrigger data-testid="select-new-task-type">
                      <SelectValue placeholder="Task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="follow-up">Follow Up</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={2}
                    data-testid="textarea-new-task-description"
                  />
                  <Button
                    className="w-full"
                    onClick={() => createTaskMutation.mutate(newTask)}
                    disabled={!newTask.title || createTaskMutation.isPending}
                    data-testid="button-add-task"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </CardContent>
              </Card>

              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Card key={task.id} className={task.completed ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() =>
                                toggleTaskMutation.mutate({
                                  taskId: task.id,
                                  completed: !task.completed,
                                })
                              }
                              className="mt-0.5"
                            >
                              {task.completed ? (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <div>
                              <p
                                className={`font-medium ${task.completed ? "line-through" : ""}`}
                              >
                                {task.title}
                              </p>
                              {task.type && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {task.type}
                                </Badge>
                              )}
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <ListTodo className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">No tasks yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="m-0 space-y-4">
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {history.map((item) => (
                      <div key={item.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-primary" />
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">{item.action}</p>
                              <span className="text-xs text-muted-foreground">
                                {item.createdAt
                                  ? format(new Date(item.createdAt), "MMM d, yyyy h:mm a")
                                  : ""}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                            {item.performedBy && (
                              <p className="text-xs text-muted-foreground mt-2">
                                by {item.performedBy}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">No history yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="actions" className="m-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.phone && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`tel:${lead.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call {lead.phone}
                      </a>
                    </Button>
                  )}
                  {lead.email && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email {lead.email}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Update Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {states.map((state) => (
                      <Button
                        key={state.id}
                        variant={lead.stateId === state.id ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => onUpdate({ stateId: state.id })}
                        style={
                          lead.stateId === state.id
                            ? { backgroundColor: state.color, borderColor: state.color }
                            : {}
                        }
                        data-testid={`button-state-${state.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {state.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
