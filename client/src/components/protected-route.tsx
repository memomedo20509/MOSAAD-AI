import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t.accessDenied}</p>
      </div>
    );
  }

  return <>{children}</>;
}
