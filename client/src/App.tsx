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
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import AddLeadPage from "@/pages/add-lead";
import UploadLeadsPage from "@/pages/upload-leads";
import DuplicatedLeadsPage from "@/pages/duplicated-leads";
import WithdrawnLeadsPage from "@/pages/withdrawn-leads";
import ActionsLogPage from "@/pages/actions-log";
import ClientsPage from "@/pages/clients";
import StatesManagementPage from "@/pages/states-management";
import SavedFiltersPage from "@/pages/saved-filters";
import UsersPage from "@/pages/users";
import TeamsPage from "@/pages/teams";
import AuthPage from "@/pages/auth-page";
import DevelopersPage from "@/pages/developers";
import ProjectsPage from "@/pages/projects";
import UnitsPage from "@/pages/units";
import AllUnitsPage from "@/pages/all-units";
import KanbanPage from "@/pages/kanban";
import ReportsPage from "@/pages/reports";
import CommissionsPage from "@/pages/commissions";
import PermissionsPage from "@/pages/permissions";
import MyDayPage from "@/pages/my-day";
import { NotificationBell } from "@/components/notification-bell";
import WhatsAppSettingsPage from "@/pages/whatsapp-settings";
import WhatsAppTemplatesPage from "@/pages/whatsapp-templates";
import WhatsAppInboxPage from "@/pages/whatsapp-inbox";
import WhatsAppCampaignsPage from "@/pages/whatsapp-campaigns";
import EmailReportsPage from "@/pages/email-reports";
import LeaderboardPage from "@/pages/leaderboard";
import MetaSettingsPage from "@/pages/meta-settings";
import IntegrationsSettingsPage from "@/pages/integrations-settings";

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

const ADMIN_MANAGER_ROLES = ["super_admin", "admin", "sales_admin", "sales_manager", "company_owner"] as const;
const ADMIN_ONLY_ROLES = ["super_admin", "admin", "sales_admin"] as const;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/kanban">{() => <ProtectedRoute permission="canAccessKanban"><KanbanPage /></ProtectedRoute>}</Route>
      <Route path="/reports">{() => <ProtectedRoute permission="canAccessReports"><ReportsPage /></ProtectedRoute>}</Route>
      <Route path="/leads" component={LeadsPage} />
      <Route path="/leads/new" component={AddLeadPage} />
      <Route path="/leads/upload">{() => <ProtectedRoute roles={[...ADMIN_MANAGER_ROLES]}><UploadLeadsPage /></ProtectedRoute>}</Route>
      <Route path="/leads/duplicated">{() => <ProtectedRoute roles={[...ADMIN_MANAGER_ROLES]}><DuplicatedLeadsPage /></ProtectedRoute>}</Route>
      <Route path="/leads/withdrawn">{() => <ProtectedRoute roles={[...ADMIN_MANAGER_ROLES]}><WithdrawnLeadsPage /></ProtectedRoute>}</Route>
      <Route path="/leads/actions">{() => <ProtectedRoute roles={[...ADMIN_MANAGER_ROLES]}><ActionsLogPage /></ProtectedRoute>}</Route>
      <Route path="/clients" component={ClientsPage} />
      <Route path="/settings/states">{() => <ProtectedRoute permission="canAccessSettings"><StatesManagementPage /></ProtectedRoute>}</Route>
      <Route path="/settings/filters">{() => <ProtectedRoute permission="canAccessSettings"><SavedFiltersPage /></ProtectedRoute>}</Route>
      <Route path="/settings/users">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><UsersPage /></ProtectedRoute>}</Route>
      <Route path="/settings/teams">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><TeamsPage /></ProtectedRoute>}</Route>
      <Route path="/inventory/developers">{() => <ProtectedRoute permission="canAccessInventory"><DevelopersPage /></ProtectedRoute>}</Route>
      <Route path="/inventory/projects">{() => <ProtectedRoute permission="canAccessInventory"><ProjectsPage /></ProtectedRoute>}</Route>
      <Route path="/inventory/units">{() => <ProtectedRoute permission="canAccessInventory"><AllUnitsPage /></ProtectedRoute>}</Route>
      <Route path="/inventory/projects/:projectId/units">{() => <ProtectedRoute permission="canAccessInventory"><UnitsPage /></ProtectedRoute>}</Route>
      <Route path="/commissions">{() => <ProtectedRoute permission="canAccessCommissions"><CommissionsPage /></ProtectedRoute>}</Route>
      <Route path="/settings/permissions">{() => <ProtectedRoute roles={["super_admin"]}><PermissionsPage /></ProtectedRoute>}</Route>
      <Route path="/my-day">{() => <ProtectedRoute permission="canAccessMyDay"><MyDayPage /></ProtectedRoute>}</Route>
      <Route path="/settings/whatsapp">{() => <ProtectedRoute permission="canAccessSettings"><WhatsAppSettingsPage /></ProtectedRoute>}</Route>
      <Route path="/settings/whatsapp/templates">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><WhatsAppTemplatesPage /></ProtectedRoute>}</Route>
      <Route path="/whatsapp-inbox">{() => <ProtectedRoute permission="canAccessWhatsapp"><WhatsAppInboxPage /></ProtectedRoute>}</Route>
      <Route path="/whatsapp-campaigns">{() => <ProtectedRoute permission="canAccessCampaigns"><WhatsAppCampaignsPage /></ProtectedRoute>}</Route>
      <Route path="/settings/email-reports">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_MANAGER_ROLES]}><EmailReportsPage /></ProtectedRoute>}</Route>
      <Route path="/leaderboard">{() => <ProtectedRoute permission="canAccessLeaderboard"><LeaderboardPage /></ProtectedRoute>}</Route>
      <Route path="/settings/meta">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><MetaSettingsPage /></ProtectedRoute>}</Route>
      <Route path="/settings/integrations">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><IntegrationsSettingsPage /></ProtectedRoute>}</Route>
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
      <ThemeProvider defaultTheme="light" storageKey="crm-ui-theme">
        <TooltipProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </LanguageProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
