import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/leads/new" component={AddLeadPage} />
      <Route path="/leads/upload" component={UploadLeadsPage} />
      <Route path="/leads/duplicated" component={DuplicatedLeadsPage} />
      <Route path="/leads/withdrawn" component={WithdrawnLeadsPage} />
      <Route path="/leads/actions" component={ActionsLogPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/settings/states" component={StatesManagementPage} />
      <Route path="/settings/filters" component={SavedFiltersPage} />
      <Route path="/settings/users" component={UsersPage} />
      <Route path="/settings/teams" component={TeamsPage} />
      <Route path="/inventory/developers" component={DevelopersPage} />
      <Route path="/inventory/projects" component={ProjectsPage} />
      <Route path="/inventory/projects/:projectId/units" component={UnitsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className={`flex h-screen w-full ${isRTL ? "flex-row-reverse" : ""}`}>
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className={`flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              {user && (
                <div className={`flex items-center gap-2 text-sm ${isRTL ? "flex-row-reverse" : ""}`}>
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
              <LanguageToggle />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
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
