import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/lib/i18n";
import { LanguageProvider } from "@/lib/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { NotificationBell } from "@/components/notification-bell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import UsersPage from "@/pages/users";
import TeamsPage from "@/pages/teams";
import AuthPage from "@/pages/auth-page";
import ConversationsPage from "@/pages/conversations";
import KnowledgeBasePage from "@/pages/knowledge-base";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import ChatbotConfigPage from "@/pages/chatbot-config";
import IntegrationsPage from "@/pages/integrations";

function LogoutButton() {
  const { logoutMutation } = useAuth();
  const { t } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      data-testid="button-logout"
    >
      {logoutMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      {t.signOut}
    </Button>
  );
}

const ADMIN_ONLY_ROLES = ["super_admin", "admin", "sales_admin"] as const;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/knowledge-base" component={KnowledgeBasePage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/chatbot-config" component={ChatbotConfigPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/users">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><UsersPage /></ProtectedRoute>}</Route>
      <Route path="/settings/teams">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><TeamsPage /></ProtectedRoute>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  useRealtime();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center gap-2 text-sm">
                {user.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt={user.firstName || "User"}
                    className="h-8 w-8 rounded-full"
                    data-testid="img-user-avatar"
                  />
                )}
                <span className="hidden md:inline text-muted-foreground" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            )}
            <NotificationBell />
            <LanguageToggle />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Router />
        </main>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="salesbot-ui-theme">
        <TooltipProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
            <Toaster />
          </LanguageProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
