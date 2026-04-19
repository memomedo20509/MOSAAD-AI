import { Switch, Route, useLocation, Redirect } from "wouter";
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
import { PlatformLayout } from "@/components/platform-layout";
import { PublicLayout } from "@/components/public-layout";
import { TourProvider, useTour } from "@/hooks/use-tour";
import { GuidedTour } from "@/components/guided-tour";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
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
import LeadPipelinePage from "@/pages/lead-pipeline";
import LeaderboardPage from "@/pages/leaderboard";
import FollowUpsPage from "@/pages/follow-ups";
import UploadLeadsPage from "@/pages/upload-leads";
import DuplicateLeadsPage from "@/pages/duplicate-leads";
import WithdrawnLeadsPage from "@/pages/withdrawn-leads";
import ActivityLogPage from "@/pages/activity-log";
import PlatformDashboard from "@/pages/platform/dashboard";
import PlatformCompaniesPage from "@/pages/platform/companies";
import CompanyDetailPage from "@/pages/platform/company-detail";
import PlatformRevenuePage from "@/pages/platform/revenue";
import PlatformPlansPage from "@/pages/platform/plans";
import PlatformTicketsPage from "@/pages/platform/tickets";
import TicketDetailPage from "@/pages/platform/ticket-detail";
import PlatformNotificationsPage from "@/pages/platform/notifications";
import PlatformSettingsPage from "@/pages/platform/settings";
import PlatformLeadsPage from "@/pages/platform-leads";
import PlatformLeadPipelinePage from "@/pages/platform-lead-pipeline";
import HomePage from "@/pages/public/home";
import PricingPage from "@/pages/public/pricing";
import AboutPage from "@/pages/public/about";
import ContactPage from "@/pages/public/contact";
import RegisterPage from "@/pages/public/register";
import PrivacyPolicyPage from "@/pages/public/privacy-policy";
import TermsOfServicePage from "@/pages/public/terms-of-service";
import PlatformBlogPage from "@/pages/platform/blog";
import BlogCategoriesPage from "@/pages/platform/blog-categories";
import BlogEditorPage from "@/pages/platform/blog-editor";
import PlatformLoginPage from "@/pages/platform/login";
import BlogIndexPage from "@/pages/blog/index";
import BlogArticlePage from "@/pages/blog/article";
import OnboardingPage from "@/pages/onboarding";
import SupportTicketsPage from "@/pages/support/tickets";
import SupportTicketDetailPage from "@/pages/support/ticket-detail";
import ProductsPage from "@/pages/products";
import OrdersPage from "@/pages/orders";

// Public-only paths — always shown with PublicLayout, no auth required
const ALWAYS_PUBLIC_PATHS = ["/pricing", "/about", "/contact", "/privacy-policy", "/terms-of-service"];

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

function EcommerceRoute({ children }: { children: JSX.Element | null }) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.companyBusinessType !== "ecommerce") return <Redirect to="/" />;
  return <>{children}</>;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/leads/pipeline" component={LeadPipelinePage} />
      <Route path="/leads/upload" component={UploadLeadsPage} />
      <Route path="/leads/duplicates" component={DuplicateLeadsPage} />
      <Route path="/leads/withdrawn" component={WithdrawnLeadsPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/follow-ups" component={FollowUpsPage} />
      <Route path="/activity-log" component={ActivityLogPage} />
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/knowledge-base" component={KnowledgeBasePage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/chatbot-config" component={ChatbotConfigPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/users">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><UsersPage /></ProtectedRoute>}</Route>
      <Route path="/settings/teams">{() => <ProtectedRoute permission="canAccessSettings" roles={[...ADMIN_ONLY_ROLES]}><TeamsPage /></ProtectedRoute>}</Route>
      <Route path="/products">{() => <EcommerceRoute><ProductsPage /></EcommerceRoute>}</Route>
      <Route path="/orders">{() => <EcommerceRoute><OrdersPage /></EcommerceRoute>}</Route>
      <Route path="/support/tickets" component={SupportTicketsPage} />
      <Route path="/support/tickets/:id" component={SupportTicketDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PlatformRouter() {
  return (
    <PlatformLayout>
      <Switch>
        <Route path="/platform" component={PlatformDashboard} />
        <Route path="/platform/companies" component={PlatformCompaniesPage} />
        <Route path="/platform/companies/:id" component={CompanyDetailPage} />
        <Route path="/platform/revenue" component={PlatformRevenuePage} />
        <Route path="/platform/plans" component={PlatformPlansPage} />
        <Route path="/platform/tickets" component={PlatformTicketsPage} />
        <Route path="/platform/tickets/:id" component={TicketDetailPage} />
        <Route path="/platform/notifications" component={PlatformNotificationsPage} />
        <Route path="/platform/settings" component={PlatformSettingsPage} />
        <Route path="/platform/leads/pipeline" component={PlatformLeadPipelinePage} />
        <Route path="/platform/leads" component={PlatformLeadsPage} />
        <Route path="/platform/blog/categories" component={BlogCategoriesPage} />
        <Route path="/platform/blog/editor/:id">{(params) => <BlogEditorPage params={params} />}</Route>
        <Route path="/platform/blog/editor">{() => <BlogEditorPage />}</Route>
        <Route path="/platform/blog" component={PlatformBlogPage} />
        <Route component={NotFound} />
      </Switch>
    </PlatformLayout>
  );
}

type OnboardingStatus = {
  onboardingStep: number;
  hasCompletedOnboarding: boolean;
  hasSeenTour: boolean;
};

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { isTourOpen, openTour, closeTour } = useTour();

  const { data: onboardingStatus } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
    enabled: !!user && user.role !== "platform_admin",
  });

  useEffect(() => {
    if (!user || user.role === "platform_admin") return;
    if (location === "/onboarding") return;
    if (!onboardingStatus) return;

    const ownerRoles = ["company_owner", "super_admin"];
    if (ownerRoles.includes(user.role ?? "") && !onboardingStatus.hasCompletedOnboarding) {
      navigate("/onboarding");
      return;
    }

    if (onboardingStatus.hasCompletedOnboarding && !onboardingStatus.hasSeenTour && location === "/") {
      const timer = setTimeout(() => openTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [user, onboardingStatus, location, navigate, openTour]);

  return (
    <>
      {children}
      <GuidedTour open={isTourOpen} onClose={closeTour} />
    </>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  useRealtime();

  if (user?.role === "platform_admin") {
    return <PlatformRouter />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <TourProvider>
      <OnboardingGuard>
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
              <AppRouter />
            </main>
          </div>
        </SidebarProvider>
      </OnboardingGuard>
    </TourProvider>
  );
}

function PublicRouter() {
  return (
    <PublicLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/privacy-policy" component={PrivacyPolicyPage} />
        <Route path="/terms-of-service" component={TermsOfServicePage} />
        <Route component={NotFound} />
      </Switch>
    </PublicLayout>
  );
}

function PublicBlogRouter() {
  return (
    <PublicLayout>
      <Switch>
        <Route path="/blog/:slug">{(params) => <BlogArticlePage params={params} />}</Route>
        <Route path="/blog" component={BlogIndexPage} />
        <Route component={null} />
      </Switch>
    </PublicLayout>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Blog pages are always public
  const isPublicBlog = location === "/blog" || location.startsWith("/blog/");
  if (isPublicBlog) {
    return <PublicBlogRouter />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Always-public paths are shown in PublicLayout regardless of auth state
  if (ALWAYS_PUBLIC_PATHS.includes(location)) {
    return <PublicRouter />;
  }

  // Platform login page: always accessible
  if (location === "/platform/login") {
    if (user?.role === "platform_admin") return <Redirect to="/platform" />;
    if (user) return <Redirect to="/" />;
    return <PlatformLoginPage />;
  }

  // Auth page is always accessible — wrap in PublicLayout for consistent header/footer
  if (location === "/auth") {
    if (user) return <Redirect to="/" />;
    return <PublicLayout><AuthPage /></PublicLayout>;
  }

  // Register page: only for non-authenticated users
  if (location === "/register") {
    if (user) return <Redirect to="/" />;
    return <PublicRouter />;
  }

  // Root route: marketing home if not logged in, dashboard if logged in
  if (location === "/" && !user) {
    return <PublicRouter />;
  }

  // Platform routes: unauthenticated users go to platform login
  if (!user && (location === "/platform" || location.startsWith("/platform/"))) {
    return <Redirect to="/platform/login" />;
  }

  // Not logged in for app routes → redirect to /auth (shown with PublicLayout)
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Onboarding wizard: show without sidebar/header for clean UX
  if (location === "/onboarding") {
    return <OnboardingPage />;
  }

  // Company users trying to access platform paths → redirect to dashboard
  if (user.role !== "platform_admin" && (location === "/platform" || location.startsWith("/platform/"))) {
    return <Redirect to="/" />;
  }

  // Logged in → show the authenticated app
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
