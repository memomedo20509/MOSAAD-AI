import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, TrendingUp, Filter, Plus, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Commission } from "@shared/schema";
import { format } from "date-fns";

const editCommissionSchema = z.object({
  unitPrice: z.number().min(0),
  commissionPercent: z.number().min(0).max(100),
  commissionAmount: z.number().min(0),
  project: z.string().optional(),
  notes: z.string().optional(),
});

type EditCommissionForm = z.infer<typeof editCommissionSchema>;

type CommissionSummary = {
  agentId: string;
  agentName: string;
  month: string;
  total: number;
  count: number;
};

export default function CommissionsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const role = user?.role;
  const isAgent = role === "sales_agent";
  const isManager = role === "sales_manager";
  const isAdmin = role === "super_admin" || role === "admin";

  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);

  const { data: commissions = [], isLoading } = useQuery<Commission[]>({
    queryKey: ["/api/commissions"],
  });

  const { data: summary = [] } = useQuery<CommissionSummary[]>({
    queryKey: ["/api/commissions/summary"],
  });

  const form = useForm<EditCommissionForm>({
    resolver: zodResolver(editCommissionSchema),
    defaultValues: {
      unitPrice: 0,
      commissionPercent: 2,
      commissionAmount: 0,
      project: "",
      notes: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditCommissionForm }) => {
      return apiRequest("PATCH", `/api/commissions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      setEditingCommission(null);
      toast({ title: t.commissionUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.commissionUpdatedError, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/commissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      toast({ title: t.commissionDeletedSuccess });
    },
    onError: () => {
      toast({ title: t.commissionDeletedError, variant: "destructive" });
    },
  });

  const openEdit = (commission: Commission) => {
    setEditingCommission(commission);
    form.reset({
      unitPrice: commission.unitPrice,
      commissionPercent: commission.commissionPercent,
      commissionAmount: commission.commissionAmount,
      project: commission.project ?? "",
      notes: commission.notes ?? "",
    });
  };

  const onSubmitEdit = (values: EditCommissionForm) => {
    if (!editingCommission) return;
    updateMutation.mutate({ id: editingCommission.id, data: values });
  };

  const agents = Array.from(
    new Set(commissions.map((c) => c.agentId).filter(Boolean))
  ).map((id) => {
    const c = commissions.find((x) => x.agentId === id);
    return { id: id!, name: c?.agentName ?? id! };
  });

  const months = Array.from(new Set(commissions.map((c) => c.month))).sort(
    (a, b) => b.localeCompare(a)
  );

  const projects = Array.from(
    new Set(commissions.map((c) => c.project).filter(Boolean))
  ) as string[];

  const filtered = commissions.filter((c) => {
    if (filterAgent !== "all" && c.agentId !== filterAgent) return false;
    if (filterMonth !== "all" && c.month !== filterMonth) return false;
    if (filterProject !== "all" && c.project !== filterProject) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const myCommissionsThisMonth = commissions
    .filter((c) => c.agentId === user?.id && c.month === currentMonth)
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  const teamCommissionsThisMonth = commissions
    .filter((c) => c.month === currentMonth)
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-commissions-title">
          {t.commissionsTitle}
        </h1>
        <p className="text-muted-foreground">{t.commissionsSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {isAgent && (
          <Card data-testid="card-my-commissions-month">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.myCommissionsThisMonth}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-my-commissions-amount">
                {myCommissionsThisMonth.toLocaleString()} {t.currency}
              </div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>
        )}
        {(isManager || isAdmin) && (
          <Card data-testid="card-team-commissions-month">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.teamCommissionsThisMonth}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-commissions-amount">
                {teamCommissionsThisMonth.toLocaleString()} {t.currency}
              </div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>
        )}
        <Card data-testid="card-total-filtered-commissions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.totalCommissions}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-commissions-amount">
              {totalAmount.toLocaleString()} {t.currency}
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} {t.commissionDeals}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-commissions-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.commissionDeals}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-commissions-count">
              {filtered.length}
            </div>
            <p className="text-xs text-muted-foreground">{t.totalClosedDeals}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            {t.filters}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {!isAgent && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t.agent}</label>
                <Select value={filterAgent} onValueChange={setFilterAgent}>
                  <SelectTrigger data-testid="select-filter-agent">
                    <SelectValue placeholder={t.allAgents} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allAgents}</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">{t.month}</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger data-testid="select-filter-month">
                  <SelectValue placeholder={t.allMonths} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allMonths}</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t.project}</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger data-testid="select-filter-project">
                  <SelectValue placeholder={t.allProjects} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allProjects}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.commissionsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              {t.noCommissionsFound}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isAgent && <TableHead>{t.agent}</TableHead>}
                    <TableHead>{t.month}</TableHead>
                    <TableHead>{t.project}</TableHead>
                    <TableHead>{t.unitPrice}</TableHead>
                    <TableHead>{t.commissionPercent}</TableHead>
                    <TableHead>{t.commissionAmount}</TableHead>
                    <TableHead>{t.notes}</TableHead>
                    <TableHead>{t.createdAt}</TableHead>
                    {(isAdmin || isManager) && <TableHead>{t.actions}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} data-testid={`row-commission-${c.id}`}>
                      {!isAgent && (
                        <TableCell className="font-medium">{c.agentName || "-"}</TableCell>
                      )}
                      <TableCell>
                        <Badge variant="secondary">{c.month}</Badge>
                      </TableCell>
                      <TableCell>{c.project || "-"}</TableCell>
                      <TableCell>{(c.unitPrice || 0).toLocaleString()} {t.currency}</TableCell>
                      <TableCell>{c.commissionPercent}%</TableCell>
                      <TableCell className="font-semibold text-green-600 dark:text-green-400">
                        {(c.commissionAmount || 0).toLocaleString()} {t.currency}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.notes || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {c.createdAt ? format(new Date(c.createdAt), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      {(isAdmin || isManager) && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(c)}
                              data-testid={`button-edit-commission-${c.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm(t.deleteCommissionConfirm)) {
                                    deleteMutation.mutate(c.id);
                                  }
                                }}
                                data-testid={`button-delete-commission-${c.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/50">
                    {!isAgent && <TableCell>{t.total}</TableCell>}
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-green-600 dark:text-green-400">
                      {totalAmount.toLocaleString()} {t.currency}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    {(isAdmin || isManager) && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(isAdmin || isManager) && summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t.commissionSummaryByAgent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.agent}</TableHead>
                  <TableHead>{t.month}</TableHead>
                  <TableHead>{t.commissionDeals}</TableHead>
                  <TableHead>{t.totalCommissions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s, i) => (
                  <TableRow key={i} data-testid={`row-summary-${s.agentId}-${s.month}`}>
                    <TableCell className="font-medium">{s.agentName}</TableCell>
                    <TableCell><Badge variant="secondary">{s.month}</Badge></TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell className="font-semibold text-green-600 dark:text-green-400">
                      {s.total.toLocaleString()} {t.currency}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingCommission} onOpenChange={(open) => !open && setEditingCommission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editCommission}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.unitPrice}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-unit-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.commissionPercent}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-commission-percent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.commissionAmount}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-commission-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.project}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-commission-project" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.notes}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-commission-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCommission(null)}
                  data-testid="button-cancel-edit-commission"
                >
                  {t.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-commission"
                >
                  {updateMutation.isPending ? t.saving : t.save}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
