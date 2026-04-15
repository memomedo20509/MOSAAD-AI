import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, Pencil, Trash2, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  features: string[] | null;
  maxUsers: number | null;
  maxLeads: number | null;
  isActive: boolean | null;
  createdAt: string;
}

interface PlanForm {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string;
  maxUsers?: number;
  maxLeads?: number;
  isActive: boolean;
}

function PlanDialog({ plan, open, onClose }: { plan?: Plan; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!plan;

  const { register, handleSubmit, reset, watch, setValue } = useForm<PlanForm>({
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      priceMonthly: plan?.priceMonthly ?? 0,
      priceYearly: plan?.priceYearly ?? undefined,
      features: plan?.features?.join("\n") ?? "",
      maxUsers: plan?.maxUsers ?? undefined,
      maxLeads: plan?.maxLeads ?? undefined,
      isActive: plan?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      const payload = {
        ...data,
        features: data.features ? data.features.split("\n").filter(f => f.trim()) : [],
      };
      if (isEdit) {
        await apiRequest("PATCH", `/api/platform/plans/${plan.id}`, payload);
      } else {
        await apiRequest("POST", "/api/platform/plans", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      toast({ title: isEdit ? "تم تحديث الباقة" : "تم إنشاء الباقة" });
      onClose();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <Label>اسم الباقة *</Label>
            <Input {...register("name", { required: true })} placeholder="مثال: باقة المحترف" data-testid="input-plan-name" />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea {...register("description")} placeholder="وصف قصير للباقة" rows={2} data-testid="input-plan-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>السعر الشهري (ج.م) *</Label>
              <Input type="number" {...register("priceMonthly", { valueAsNumber: true })} data-testid="input-plan-price-monthly" />
            </div>
            <div>
              <Label>السعر السنوي (ج.م)</Label>
              <Input type="number" {...register("priceYearly", { valueAsNumber: true })} data-testid="input-plan-price-yearly" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>أقصى عدد مستخدمين</Label>
              <Input type="number" {...register("maxUsers", { valueAsNumber: true })} data-testid="input-plan-max-users" />
            </div>
            <div>
              <Label>أقصى عدد ليدز</Label>
              <Input type="number" {...register("maxLeads", { valueAsNumber: true })} data-testid="input-plan-max-leads" />
            </div>
          </div>
          <div>
            <Label>المميزات (كل ميزة في سطر)</Label>
            <Textarea
              {...register("features")}
              placeholder={"إدارة الليدز\nواتساب\nتقارير متقدمة"}
              rows={4}
              data-testid="input-plan-features"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", v)}
              data-testid="switch-plan-active"
            />
            <Label>الباقة مفعّلة</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-plan">
              {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformPlansPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>();

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/platform/plans"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/platform/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      toast({ title: "تم حذف الباقة" });
    },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الباقات</h1>
          <p className="text-muted-foreground">خطط الاشتراك المتاحة للشركات</p>
        </div>
        <Button onClick={() => { setEditingPlan(undefined); setDialogOpen(true); }} data-testid="button-add-plan">
          <Plus className="h-4 w-4 ml-1" />
          إضافة باقة
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد باقات بعد</p>
            <Button className="mt-4" onClick={() => { setEditingPlan(undefined); setDialogOpen(true); }}>
              إضافة أول باقة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${!plan.isActive ? "opacity-60" : ""}`} data-testid={`card-plan-${plan.id}`}>
              {!plan.isActive && (
                <Badge className="absolute top-3 left-3 bg-gray-100 text-gray-600">غير مفعّل</Badge>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingPlan(plan); setDialogOpen(true); }} data-testid={`button-edit-plan-${plan.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(plan.id)} data-testid={`button-delete-plan-${plan.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <span className="text-2xl font-bold">{plan.priceMonthly.toLocaleString("ar-EG")}</span>
                  <span className="text-muted-foreground text-sm"> ج.م/شهر</span>
                </div>
                {plan.priceYearly && (
                  <p className="text-xs text-muted-foreground">{plan.priceYearly.toLocaleString("ar-EG")} ج.م/سنة</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {plan.maxUsers && <span>أقصى {plan.maxUsers} مستخدم</span>}
                  {plan.maxLeads && <span>أقصى {plan.maxLeads} ليد</span>}
                </div>
                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-1">
                    {plan.features.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-sm">
                        <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-xs text-muted-foreground">+{plan.features.length - 5} مميزات أخرى</li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanDialog
        plan={editingPlan}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingPlan(undefined); }}
      />
    </div>
  );
}
