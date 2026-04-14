import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">غير مصرح لك بالوصول إلى هذه الصفحة.</p>
      </div>
    );
  }

  return <>{children}</>;
}
