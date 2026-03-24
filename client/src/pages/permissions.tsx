import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import type { RolePermissions } from "@shared/models/auth";

const ROLES = [
  { key: "super_admin", label: "مدير النظام" },
  { key: "company_owner", label: "صاحب الشركة" },
  { key: "sales_admin", label: "سيلز ادمن" },
  { key: "team_leader", label: "تيم ليدر" },
  { key: "sales_agent", label: "سيلز" },
];

const PERMISSIONS: { key: keyof RolePermissions; labelAr: string; labelEn: string }[] = [
  { key: "canViewAllLeads", labelAr: "مشاهدة كل الليدز", labelEn: "View All Leads" },
  { key: "canManageUsers", labelAr: "إدارة المستخدمين", labelEn: "Manage Users" },
  { key: "canManageTeams", labelAr: "إدارة الفرق", labelEn: "Manage Teams" },
  { key: "canViewAllReports", labelAr: "الوصول للتقارير", labelEn: "View All Reports" },
  { key: "canDeleteData", labelAr: "حذف البيانات", labelEn: "Delete Data" },
  { key: "canTransferLeads", labelAr: "تحويل الليدز", labelEn: "Transfer Leads" },
];

export default function PermissionsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, RolePermissions>>({});

  const { data: rolePermissions, isLoading } = useQuery<Record<string, RolePermissions>>({
    queryKey: ["/api/role-permissions"],
    enabled: currentUser?.role === "super_admin",
  });

  useEffect(() => {
    if (rolePermissions) {
      setPermissions(rolePermissions);
    }
  }, [rolePermissions]);

  const saveMutation = useMutation({
    mutationFn: async ({ role, perms }: { role: string; perms: RolePermissions }) => {
      const res = await apiRequest("PUT", `/api/role-permissions/${role}`, perms);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      toast({ title: t.permissionsSavedSuccess });
    },
    onError: () => {
      toast({ title: t.permissionsSavedError, variant: "destructive" });
    },
  });

  const handlePermissionChange = (role: string, permKey: keyof RolePermissions, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: value,
      },
    }));
  };

  const handleSaveRole = (role: string) => {
    if (permissions[role]) {
      saveMutation.mutate({ role, perms: permissions[role] });
    }
  };

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Shield className="h-6 w-6" />
          {t.permissionsManagement}
        </h1>
        <p className="text-muted-foreground">{t.permissionsManagementSubtitle}</p>
      </div>

      <div className="grid gap-4">
        {ROLES.map((role) => {
          const rolePerms = permissions[role.key] || {};
          return (
            <Card key={role.key} data-testid={`card-role-${role.key}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{role.label}</span>
                  <Button
                    size="sm"
                    onClick={() => handleSaveRole(role.key)}
                    disabled={saveMutation.isPending}
                    data-testid={`button-save-permissions-${role.key}`}
                  >
                    <Save className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                    {t.savePermissions}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`${role.key}-${perm.key}`}
                        checked={!!rolePerms[perm.key]}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(role.key, perm.key, !!checked)
                        }
                        data-testid={`checkbox-${role.key}-${perm.key}`}
                      />
                      <label
                        htmlFor={`${role.key}-${perm.key}`}
                        className="text-sm cursor-pointer"
                      >
                        {perm.labelAr}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
