import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Building2, Users, Ban, CheckCircle, FileText, Calendar, CreditCard, Receipt } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

interface SubscriptionDetail {
  id: string;
  companyId: string;
  planId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  plan: {
    id: string;
    name: string;
    nameAr: string;
    priceMonthly: number;
    priceAnnual: number;
    currency: string;
  } | null;
}

interface InvoiceRecord {
  id: string;
  companyId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  planId: string | null;
  status: string;
  createdAt: string;
  logoUrl: string | null;
  primaryColor: string | null;
  users: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string | null;
    isActive: boolean | null;
    createdAt: string | null;
  }[];
  subscription: SubscriptionDetail | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
  past_due: "bg-yellow-100 text-yellow-700",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ invoiceNumber: "", amount: "", currency: "EGP", status: "sent", dueDate: "" });

  const STATUS_LABELS: Record<string, string> = {
    active: t.statusActive,
    trial: t.statusTrial,
    suspended: t.statusSuspended,
    cancelled: t.statusCancelled,
    past_due: t.statusPastDue,
  };

  const ROLE_LABELS: Record<string, string> = {
    super_admin: t.roleLabSuperAdmin,
    company_owner: t.roleLabCompanyOwner,
    sales_admin: t.roleLabSalesAdmin,
    team_leader: t.roleLabTeamLeader,
    sales_agent: t.roleLabSalesAgent,
    admin: t.roleLabAdmin,
  };

  const INVOICE_STATUS_LABELS: Record<string, string> = {
    draft: t.invoiceStatusDraft,
    sent: t.invoiceStatusSent,
    paid: t.invoiceStatusPaid,
    overdue: t.invoiceStatusOverdue,
    cancelled: t.invoiceStatusCancelled,
  };

  const { data: company, isLoading } = useQuery<CompanyDetail>({
    queryKey: ["/api/platform/companies", id],
    queryFn: async () => {
      const res = await fetch(`/api/platform/companies/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<InvoiceRecord[]>({
    queryKey: ["/api/platform/companies", id, "invoices"],
    queryFn: async () => {
      const res = await fetch(`/api/platform/companies/${id}/invoices`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/platform/companies/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      toast({ title: t.companyDetailSuspended });
      setSuspendDialogOpen(false);
    },
    onError: () => toast({ title: t.companyDetailSuspendFail, variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/platform/companies/${id}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      toast({ title: t.companyDetailReactivated });
    },
    onError: () => toast({ title: t.companyDetailReactivateFail, variant: "destructive" }),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/platform/companies/${id}/invoices`, {
        invoiceNumber: newInvoice.invoiceNumber,
        amount: parseFloat(newInvoice.amount),
        currency: newInvoice.currency,
        status: newInvoice.status,
        dueDate: newInvoice.dueDate ? new Date(newInvoice.dueDate).toISOString() : undefined,
        companyId: id,
      });
    },
    onSuccess: () => {
      refetchInvoices();
      setAddInvoiceOpen(false);
      setNewInvoice({ invoiceNumber: "", amount: "", currency: "EGP", status: "sent", dueDate: "" });
      toast({ title: t.companyDetailInvoiceCreated });
    },
    onError: () => toast({ title: t.companyDetailInvoiceFail, variant: "destructive" }),
  });

  const formatCurrency = (amount: number, currency: string) =>
    `${amount.toLocaleString(isRTL ? "ar-EG" : "en-US")} ${currency}`;

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString(isRTL ? "ar-EG" : "en-US") : "—";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return <div className="text-center py-20 text-muted-foreground">{t.companyDetailNotFound}</div>;
  }

  const sub = company.subscription;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/platform/companies" className="hover:text-foreground flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          {t.companyDetailBreadcrumb}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{company.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{company.name}</h1>
              <Badge className={STATUS_COLORS[company.status] ?? ""}>
                {STATUS_LABELS[company.status] ?? company.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{company.slug}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {company.status !== "suspended" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSuspendDialogOpen(true)}
              data-testid="button-suspend-company"
            >
              <Ban className="h-4 w-4 me-1" />
              {t.companyDetailSuspendBtn}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              data-testid="button-reactivate-company"
            >
              <CheckCircle className="h-4 w-4 me-1" />
              {t.companyDetailReactivateBtn}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" dir={isRTL ? "rtl" : "ltr"}>
        <TabsList>
          <TabsTrigger value="profile">{t.companyDetailProfileTab}</TabsTrigger>
          <TabsTrigger value="users">{t.companyDetailUsersTab}</TabsTrigger>
          <TabsTrigger value="subscription">{t.companyDetailSubscriptionTab}</TabsTrigger>
          <TabsTrigger value="invoices">{t.companyDetailInvoicesTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.companyDetailInfoTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">{t.companyDetailNameLabel}</Label>
                <p className="font-medium">{company.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t.companyDetailSlugLabel}</Label>
                <p className="font-medium">{company.slug}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t.companyDetailIndustryLabel}</Label>
                <p className="font-medium">{company.industry ?? "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t.companyDetailCreatedLabel}</Label>
                <p className="font-medium">{formatDate(company.createdAt)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">{t.companyDetailStatusLabel}</Label>
                <Badge className={`mt-1 ${STATUS_COLORS[company.status] ?? ""}`}>
                  {STATUS_LABELS[company.status] ?? company.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.companyDetailUsersTitle} ({company.users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t.companyDetailNoUsers}</p>
              ) : (
                <div className="space-y-2">
                  {company.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`row-user-${user.id}`}>
                      <div>
                        <p className="font-medium text-sm">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email ?? user.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[user.role ?? ""] ?? user.role}
                        </Badge>
                        <div className={`h-2 w-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-400"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t.companyDetailSubTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sub ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailPlanLabel}</Label>
                    <p className="font-medium">{sub.plan?.nameAr || sub.plan?.name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailMonthlyLabel}</Label>
                    <p className="font-medium">
                      {sub.plan ? formatCurrency(sub.plan.priceMonthly, sub.plan.currency) : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailSubStatusLabel}</Label>
                    <Badge className={`mt-1 ${STATUS_COLORS[sub.status] ?? ""}`}>
                      {STATUS_LABELS[sub.status] ?? sub.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailPeriodStartLabel}</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(sub.currentPeriodStart)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailRenewalLabel}</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(sub.currentPeriodEnd)}
                    </p>
                  </div>
                  {sub.trialEndsAt && (
                    <div>
                      <Label className="text-muted-foreground text-xs">{t.companyDetailTrialEndLabel}</Label>
                      <p className="font-medium">{formatDate(sub.trialEndsAt)}</p>
                    </div>
                  )}
                  {sub.cancelledAt && (
                    <div>
                      <Label className="text-muted-foreground text-xs">{t.companyDetailCancelDateLabel}</Label>
                      <p className="font-medium text-red-600">{formatDate(sub.cancelledAt)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">{t.companyDetailNoSub}</p>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailAssignedPlanLabel}</Label>
                    <p className="font-medium">{company.planId ?? t.companyDetailNoPlan}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">{t.companyDetailAccountStatusLabel}</Label>
                    <Badge className={`mt-1 ${STATUS_COLORS[company.status] ?? ""}`}>
                      {STATUS_LABELS[company.status] ?? company.status}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t.companyDetailInvoicesTitle}
              </CardTitle>
              <Button size="sm" onClick={() => setAddInvoiceOpen(true)} data-testid="button-add-invoice">
                {t.companyDetailAddInvoiceBtn}
              </Button>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t.companyDetailNoInvoices}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`row-invoice-${inv.id}`}>
                      <div>
                        <p className="font-medium text-sm">{t.companyDetailInvoiceNum}{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(inv.createdAt)}
                          {inv.dueDate && ` · ${t.companyDetailInvoiceDue} ${formatDate(inv.dueDate)}`}
                          {inv.paidAt && ` · ${t.companyDetailInvoicePaid} ${formatDate(inv.paidAt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-sm">{formatCurrency(inv.amount, inv.currency)}</p>
                        <Badge className={INVOICE_STATUS_COLORS[inv.status] ?? ""}>
                          {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.companyDetailSuspendDialogTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.companyDetailSuspendConfirmText} <strong>{company.name}</strong>? {t.companyDetailSuspendNote}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>{t.companyDetailCancel}</Button>
            <Button
              variant="destructive"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              {t.companyDetailSuspendConfirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addInvoiceOpen} onOpenChange={setAddInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.companyDetailNewInvoiceTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.invoiceNumberLabel}</Label>
              <Input
                value={newInvoice.invoiceNumber}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                placeholder="INV-2024-001"
                data-testid="input-invoice-number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.invoiceAmountLabel}</Label>
                <Input
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  placeholder="0"
                  data-testid="input-invoice-amount"
                />
              </div>
              <div>
                <Label>{t.invoiceCurrencyLabel}</Label>
                <Select value={newInvoice.currency} onValueChange={(v) => setNewInvoice({ ...newInvoice, currency: v })}>
                  <SelectTrigger data-testid="select-invoice-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGP">{t.invoiceCurrencyEGP}</SelectItem>
                    <SelectItem value="USD">{t.invoiceCurrencyUSD}</SelectItem>
                    <SelectItem value="SAR">{t.invoiceCurrencySAR}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t.invoiceStatusLabel}</Label>
                <Select value={newInvoice.status} onValueChange={(v) => setNewInvoice({ ...newInvoice, status: v })}>
                  <SelectTrigger data-testid="select-invoice-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t.invoiceStatusDraft}</SelectItem>
                    <SelectItem value="sent">{t.invoiceStatusSent}</SelectItem>
                    <SelectItem value="paid">{t.invoiceStatusPaid}</SelectItem>
                    <SelectItem value="overdue">{t.invoiceStatusOverdue}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.invoiceDueDateLabel}</Label>
                <Input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  data-testid="input-invoice-due-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInvoiceOpen(false)}>{t.companyDetailCancel}</Button>
            <Button
              onClick={() => createInvoiceMutation.mutate()}
              disabled={createInvoiceMutation.isPending || !newInvoice.invoiceNumber || !newInvoice.amount}
              data-testid="button-confirm-add-invoice"
            >
              {t.invoiceCreateBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
