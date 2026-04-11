import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  Lock,
} from "lucide-react";
import type { LeadState } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

const defaultColors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#64748b",
  "#14b8a6",
];

const CATEGORY_OPTIONS = [
  { value: "untouched", label: "غير متفاعل (Untouched)", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "active", label: "تحت المتابعة (Active)", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "won", label: "فاز (Won)", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "lost", label: "خسارة (Lost)", color: "bg-red-100 text-red-700 border-red-300" },
];

function getCategoryBadge(category: string) {
  const opt = CATEGORY_OPTIONS.find(o => o.value === category);
  if (!opt) return null;
  return (
    <Badge variant="outline" className={`text-xs ${opt.color}`}>
      {opt.label}
    </Badge>
  );
}

export default function StatesManagementPage() {
  const { t } = useLanguage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editState, setEditState] = useState<LeadState | null>(null);
  const [deleteState, setDeleteState] = useState<LeadState | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(defaultColors[0]);
  const [newCategory, setNewCategory] = useState("active");
  const [newCanGoBack, setNewCanGoBack] = useState(true);
  const { toast } = useToast();

  const { data: states, isLoading } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const createStateMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; category: string; canGoBack: boolean }) => {
      return apiRequest("POST", "/api/states", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/states"] });
      setIsAddOpen(false);
      setNewName("");
      setNewColor(defaultColors[0]);
      setNewCategory("active");
      setNewCanGoBack(true);
      toast({ title: t.stateCreatedSuccess });
    },
    onError: () => {
      toast({ title: t.stateCreatedError, variant: "destructive" });
    },
  });

  const updateStateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeadState> }) => {
      return apiRequest("PATCH", `/api/states/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/states"] });
      setEditState(null);
      toast({ title: t.stateUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.stateUpdatedError, variant: "destructive" });
    },
  });

  const deleteStateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/states/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/states"] });
      setDeleteState(null);
      toast({ title: t.stateDeletedSuccess });
    },
    onError: (err: Error) => {
      toast({ title: err.message || t.stateDeletedError, variant: "destructive" });
      setDeleteState(null);
    },
  });

  const moveState = (id: string, direction: "up" | "down") => {
    if (!states) return;
    const index = states.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === states.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    updateStateMutation.mutate({
      id,
      data: { order: states[targetIndex].order },
    });
    updateStateMutation.mutate({
      id: states[targetIndex].id,
      data: { order: states[index].order },
    });
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    createStateMutation.mutate({
      name: newName.trim(),
      color: newColor,
      category: newCategory,
      canGoBack: newCanGoBack,
    });
  };

  const handleEdit = () => {
    if (!editState || !editState.name.trim()) return;
    updateStateMutation.mutate({
      id: editState.id,
      data: {
        name: editState.name,
        color: editState.color,
        category: editState.category,
        canGoBack: editState.canGoBack,
      },
    });
  };

  const sortedStates = states ? [...states].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-states-title">
            {t.statesManagementTitle}
          </h1>
          <p className="text-muted-foreground">{t.statesManagementSubtitle}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-state">
              <Plus className="h-4 w-4 mr-2" />
              {t.addState}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.addState}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.stateName}</Label>
                <Input
                  placeholder={t.stateName}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="input-new-state-name"
                />
              </div>
              <div className="space-y-2">
                <Label>الفئة (Zone)</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger data-testid="select-new-state-category">
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>يُسمح بالتراجع</Label>
                <Switch
                  checked={newCanGoBack}
                  onCheckedChange={setNewCanGoBack}
                  data-testid="switch-new-can-go-back"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.stateColor}</Label>
                <div className="flex flex-wrap gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`h-8 w-8 rounded-md border-2 transition-all ${
                        newColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`button-color-${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {t.cancel}
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newName.trim() || createStateMutation.isPending}
                data-testid="button-save-new-state"
              >
                {createStateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t.create}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.statesManagement}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedStates && sortedStates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t.stateName}</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead className="w-28 text-center">يُسمح بالتراجع</TableHead>
                  <TableHead className="w-24">{t.stateColor}</TableHead>
                  <TableHead className="w-24 text-center">{t.order}</TableHead>
                  <TableHead className="w-28 text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStates.map((state, index) => (
                  <TableRow key={state.id} data-testid={`row-state-${state.id}`}>
                    <TableCell className="text-muted-foreground">
                      {state.isSystemState ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <GripVertical className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-4 w-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: state.color }}
                        />
                        <span className="font-medium">{state.name}</span>
                        {state.isSystemState && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">نظام</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCategoryBadge(state.category ?? "active")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={state.canGoBack ?? true}
                        onCheckedChange={(checked) => {
                          updateStateMutation.mutate({ id: state.id, data: { canGoBack: checked } });
                        }}
                        data-testid={`switch-can-go-back-${state.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        className="h-6 w-12 rounded-md"
                        style={{ backgroundColor: state.color }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveState(state.id, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveState(state.id, "down")}
                          disabled={index === sortedStates.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditState(state)}
                          data-testid={`button-edit-state-${state.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteState(state)}
                          disabled={state.isSystemState}
                          title={state.isSystemState ? "لا يمكن حذف الحالات الأساسية" : undefined}
                          data-testid={`button-delete-state-${state.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{t.noStatesYet}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddOpen(true)}
              >
                {t.addFirstState}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editState}</DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.stateName}</Label>
                <Input
                  placeholder={t.stateName}
                  value={editState.name}
                  onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                  data-testid="input-edit-state-name"
                />
              </div>
              <div className="space-y-2">
                <Label>الفئة (Zone)</Label>
                <Select
                  value={editState.category ?? "active"}
                  onValueChange={(val) => setEditState({ ...editState, category: val })}
                >
                  <SelectTrigger data-testid="select-edit-state-category">
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>يُسمح بالتراجع</Label>
                <Switch
                  checked={editState.canGoBack ?? true}
                  onCheckedChange={(checked) => setEditState({ ...editState, canGoBack: checked })}
                  data-testid="switch-edit-can-go-back"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.stateColor}</Label>
                <div className="flex flex-wrap gap-2">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditState({ ...editState, color })}
                      className={`h-8 w-8 rounded-md border-2 transition-all ${
                        editState.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)}>
              {t.cancel}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateStateMutation.isPending}
              data-testid="button-save-edit-state"
            >
              {updateStateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {t.update}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteState} onOpenChange={(open) => !open && setDeleteState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteState}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteStateConfirm} "{deleteState?.name}"? {t.deleteStateWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteState && deleteStateMutation.mutate(deleteState.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-state"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
