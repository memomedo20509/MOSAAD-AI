import { useAuth } from "@/hooks/use-auth";
import { type RolePermissions, type UserRole, normalizeRole } from "@shared/models/auth";
import { Redirect } from "wouter";
import { ShieldAlert } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  permission?: keyof RolePermissions;
  roles?: UserRole[];
};

export function ProtectedRoute({ children, permission, roles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/" />;
  }

  const role = normalizeRole(user.role);
  const perms = user.permissions;

  if (roles && !roles.includes(role)) {
    return <UnauthorizedMessage />;
  }

  if (permission) {
    if (!perms || !perms[permission]) {
      return <UnauthorizedMessage />;
    }
  }

  return <>{children}</>;
}

function UnauthorizedMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4" data-testid="unauthorized-message">
      <ShieldAlert className="h-12 w-12 text-muted-foreground" />
      <div className="text-lg font-medium text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</div>
      <a href="/" className="text-sm text-primary hover:underline" data-testid="link-back-dashboard">العودة للوحة التحكم</a>
    </div>
  );
}
