import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import type { RolePermissions, CustomRole } from "@shared/models/auth";

const ROLES = [
  { key: "super_admin", label: "مدير النظام" },
  { key: "company_owner", label: "صاحب الشركة" },
  { key: "sales_admin", label: "سيلز ادمن" },
  { key: "team_leader", label: "تيم ليدر" },
  { key: "sales_agent", label: "سيلز" },
];

const ACTION_PERMISSIONS: { key: keyof RolePermissions; labelAr: string }[] = [
  { key: "canViewAllLeads", labelAr: "مشاهدة كل الليدز" },
  { key: "canManageUsers", labelAr: "إدارة المستخدمين" },
  { key: "canManageTeams", labelAr: "إدارة الفرق" },
  { key: "canViewAllReports", labelAr: "الوصول للتقارير" },
  { key: "canDeleteData", labelAr: "حذف البيانات" },
  { key: "canTransferLeads", labelAr: "تحويل الليدز" },
];

const MODULE_PERMISSIONS: { key: keyof RolePermissions; labelAr: string }[] = [
  { key: "canAccessKanban", labelAr: "الكنبان (لوحة البيع)" },
  { key: "canAccessInventory", labelAr: "مشروعات برايمري (مطورين / مشاريع / وحدات)" },
  { key: "canAccessWhatsapp", labelAr: "واتساب (صندوق البريد)" },
  { key: "canAccessCampaigns", labelAr: "حملات واتساب" },
  { key: "canAccessCommissions", labelAr: "العمولات" },
  { key: "canAccessReports", labelAr: "التقارير" },
  { key: "canAccessLeaderboard", labelAr: "الليدربورد" },
  { key: "canAccessMyDay", labelAr: "ماي داي" },
  { key: "canAccessSettings", labelAr: "الإعدادات" },
];

const DEFAULT_CUSTOM_PERMS: RolePermissions = {
  canViewAllLeads: false,
  canManageUsers: false,
  canManageTeams: false,
  canViewAllReports: false,
  canDeleteData: false,
  canTransferLeads: false,
  canAccessKanban: true,
  canAccessInventory: false,
  canAccessWhatsapp: true,
  canAccessCampaigns: false,
  canAccessCommissions: true,
  canAccessReports: false,
  canAccessLeaderboard: true,
  canAccessMyDay: true,
  canAccessSettings: false,
};

export default function PermissionsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, RolePermissions>>({});
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<RolePermissions>(DEFAULT_CUSTOM_PERMS);

  const { data: rolePermissions, isLoading } = useQuery<Record<string, RolePermissions>>({
    queryKey: ["/api/role-permissions"],
    enabled: currentUser?.role === "super_admin",
  });

  const { data: customRoles = [], isLoading: customRolesLoading } = useQuery<CustomRole[]>({
    queryKey: ["/api/custom-roles"],
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

  const createCustomRoleMutation = useMutation({
    mutationFn: async ({ name, perms }: { name: string; perms: RolePermissions }) => {
      const res = await apiRequest("POST", "/api/custom-roles", { name, permissions: perms });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ title: "تم إضافة الوظيفة بنجاح" });
      setIsAddRoleOpen(false);
      setNewRoleName("");
      setNewRolePerms(DEFAULT_CUSTOM_PERMS);
    },
    onError: (err: Error) => {
      toast({ title: err.message || "فشل إضافة الوظيفة", variant: "destructive" });
    },
  });

  const deleteCustomRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/custom-roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-roles"] });
      toast({ title: "تم حذف الوظيفة" });
    },
    onError: () => {
      toast({ title: "فشل حذف الوظيفة", variant: "destructive" });
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

  const handleNewRolePermChange = (permKey: keyof RolePermissions, value: boolean) => {
    setNewRolePerms(prev => ({ ...prev, [permKey]: value }));
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({ title: "يرجى كتابة اسم الوظيفة", variant: "destructive" });
      return;
    }
    createCustomRoleMutation.mutate({ name: newRoleName.trim(), perms: newRolePerms });
  };

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</div>
      </div>
    );
  }

  if (isLoading || customRolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Shield className="h-6 w-6" />
            {t.permissionsManagement}
          </h1>
          <p className="text-muted-foreground">{t.permissionsManagementSubtitle}</p>
        </div>
        <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-custom-role">
              <Plus className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
              إضافة وظيفة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إضافة وظيفة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الوظيفة</Label>
                <Input
                  placeholder="مثال: مشرف مبيعات"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  data-testid="input-custom-role-name"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">صلاحيات الوصول للموديولز</p>
                <div className="grid grid-cols-2 gap-3">
                  {MODULE_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`new-${perm.key}`}
                        checked={!!newRolePerms[perm.key]}
                        onCheckedChange={(checked) => handleNewRolePermChange(perm.key, !!checked)}
                        data-testid={`checkbox-new-${perm.key}`}
                      />
                      <label htmlFor={`new-${perm.key}`} className="text-sm cursor-pointer">
                        {perm.labelAr}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">صلاحيات الإجراءات</p>
                <div className="grid grid-cols-2 gap-3">
                  {ACTION_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`new-action-${perm.key}`}
                        checked={!!newRolePerms[perm.key]}
                        onCheckedChange={(checked) => handleNewRolePermChange(perm.key, !!checked)}
                        data-testid={`checkbox-new-action-${perm.key}`}
                      />
                      <label htmlFor={`new-action-${perm.key}`} className="text-sm cursor-pointer">
                        {perm.labelAr}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateRole}
                disabled={createCustomRoleMutation.isPending}
                data-testid="button-save-custom-role"
              >
                {createCustomRoleMutation.isPending ? "جاري الحفظ..." : "إضافة الوظيفة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {ROLES.map((role) => {
          const rolePerms = permissions[role.key] || {};
          return (
            <Card key={role.key} data-testid={`card-role-${role.key}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{role.label}</span>
                  {role.key !== "super_admin" && (
                    <Button
                      size="sm"
                      onClick={() => handleSaveRole(role.key)}
                      disabled={saveMutation.isPending}
                      data-testid={`button-save-permissions-${role.key}`}
                    >
                      <Save className="h-4 w-4 mr-1 rtl:mr-0 rtl:ml-1" />
                      {t.savePermissions}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">صلاحيات الوصول للموديولز</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MODULE_PERMISSIONS.map((perm) => (
                      <div key={perm.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`${role.key}-${perm.key}`}
                          checked={role.key === "super_admin" ? true : !!rolePerms[perm.key]}
                          onCheckedChange={(checked) =>
                            role.key !== "super_admin" && handlePermissionChange(role.key, perm.key, !!checked)
                          }
                          disabled={role.key === "super_admin"}
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
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">صلاحيات الإجراءات</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ACTION_PERMISSIONS.map((perm) => (
                      <div key={perm.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`${role.key}-action-${perm.key}`}
                          checked={role.key === "super_admin" ? true : !!rolePerms[perm.key]}
                          onCheckedChange={(checked) =>
                            role.key !== "super_admin" && handlePermissionChange(role.key, perm.key, !!checked)
                          }
                          disabled={role.key === "super_admin"}
                          data-testid={`checkbox-${role.key}-action-${perm.key}`}
                        />
                        <label
                          htmlFor={`${role.key}-action-${perm.key}`}
                          className="text-sm cursor-pointer"
                        >
                          {perm.labelAr}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {customRoles.map((customRole) => (
          <Card key={customRole.id} data-testid={`card-role-custom-${customRole.id}`} className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {customRole.name}
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">وظيفة مخصصة</span>
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteCustomRoleMutation.mutate(customRole.id)}
                  disabled={deleteCustomRoleMutation.isPending}
                  data-testid={`button-delete-custom-role-${customRole.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">صلاحيات الوصول للموديولز</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {MODULE_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`custom-${customRole.id}-${perm.key}`}
                        checked={!!(customRole.permissions as RolePermissions)[perm.key]}
                        disabled
                        data-testid={`checkbox-custom-${customRole.id}-${perm.key}`}
                      />
                      <label htmlFor={`custom-${customRole.id}-${perm.key}`} className="text-sm">
                        {perm.labelAr}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">صلاحيات الإجراءات</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ACTION_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`custom-action-${customRole.id}-${perm.key}`}
                        checked={!!(customRole.permissions as RolePermissions)[perm.key]}
                        disabled
                        data-testid={`checkbox-custom-action-${customRole.id}-${perm.key}`}
                      />
                      <label htmlFor={`custom-action-${customRole.id}-${perm.key}`} className="text-sm">
                        {perm.labelAr}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
