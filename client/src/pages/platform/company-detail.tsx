import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Building2, Users, Settings, Ban, CheckCircle, Download, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  trial: "تجربة",
  suspended: "موقوف",
  cancelled: "ملغي",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير النظام",
  company_owner: "صاحب الشركة",
  sales_admin: "سيلز أدمن",
  team_leader: "تيم ليدر",
  sales_agent: "سيلز",
  admin: "مدير",
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);

  const { data: company, isLoading } = useQuery<CompanyDetail>({
    queryKey: ["/api/platform/companies", id],
    queryFn: async () => {
      const res = await fetch(`/api/platform/companies/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/platform/companies/${id}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      toast({ title: "تم تعليق الشركة" });
      setSuspendDialogOpen(false);
    },
    onError: () => toast({ title: "فشل التعليق", variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/platform/companies/${id}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/companies"] });
      toast({ title: "تم إعادة تفعيل الشركة" });
    },
    onError: () => toast({ title: "فشل إعادة التفعيل", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return <div className="text-center py-20 text-muted-foreground">الشركة غير موجودة</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/platform/companies" className="hover:text-foreground flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          الشركات
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{company.name}</span>
      </div>

      {/* Header */}
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

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {company.status !== "suspended" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSuspendDialogOpen(true)}
              data-testid="button-suspend-company"
            >
              <Ban className="h-4 w-4 ml-1" />
              تعليق
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              data-testid="button-reactivate-company"
            >
              <CheckCircle className="h-4 w-4 ml-1" />
              إعادة تفعيل
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" dir="rtl">
        <TabsList>
          <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="subscription">الاشتراك</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الشركة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">اسم الشركة</Label>
                <p className="font-medium">{company.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">الرابط المختصر</Label>
                <p className="font-medium">{company.slug}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">القطاع</Label>
                <p className="font-medium">{company.industry ?? "—"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">تاريخ الإنشاء</Label>
                <p className="font-medium">
                  {company.createdAt ? new Date(company.createdAt).toLocaleDateString("ar-EG") : "—"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">الحالة</Label>
                <Badge className={`mt-1 ${STATUS_COLORS[company.status] ?? ""}`}>
                  {STATUS_LABELS[company.status] ?? company.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                المستخدمون ({company.users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا يوجد مستخدمون</p>
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

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>الاشتراك والباقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">الباقة الحالية</Label>
                <p className="font-medium">{company.planId ?? "بدون باقة"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">حالة الاشتراك</Label>
                <Badge className={`mt-1 ${STATUS_COLORS[company.status] ?? ""}`}>
                  {STATUS_LABELS[company.status] ?? company.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعليق الشركة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من تعليق شركة <strong>{company.name}</strong>؟ لن يتمكن المستخدمون من الدخول.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              تعليق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
