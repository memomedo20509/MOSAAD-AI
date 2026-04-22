import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Package,
  Ticket,
  Bell,
  Settings,
  Bot,
  LogOut,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/lib/i18n";
import { Languages } from "lucide-react";

function PlatformSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  const NAV_ITEMS = [
    { href: "/platform", label: t.platformNavDashboard, icon: LayoutDashboard, exact: true },
    { href: "/platform/companies", label: t.platformNavCompanies, icon: Building2 },
    { href: "/platform/revenue", label: t.platformNavRevenue, icon: DollarSign },
    { href: "/platform/plans", label: t.platformNavPlans, icon: Package },
    { href: "/platform/tickets", label: t.platformNavTickets, icon: Ticket },
    { href: "/platform/notifications", label: t.platformNavNotifications, icon: Bell },
    { href: "/platform/blog", label: t.platformNavBlog, icon: BookOpen },
    { href: "/platform/settings", label: t.platformNavSettings, icon: Settings },
  ];

  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["/api/platform/notifications/unread-count"],
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.count ?? 0;

  const { data: ticketsData } = useQuery<{ count: number }>({
    queryKey: ["/api/platform/tickets/open-count"],
    refetchInterval: 30000,
  });
  const openTickets = ticketsData?.count ?? 0;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location === href || location.startsWith(href + "/");
  };

  return (
    <Sidebar side={isRTL ? "right" : "left"}>
      <SidebarHeader className="p-4">
        <Link href="/platform" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-sm block" data-testid="text-platform-name">{t.platformName}</span>
            <span className="text-xs text-muted-foreground">SalesBot AI</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, item.exact)}>
                    <Link href={item.href} data-testid={`link-platform-nav-${item.href.split("/").pop()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.href === "/platform/notifications" && unreadCount > 0 && (
                        <Badge className="ms-auto h-5 px-1 text-xs">{unreadCount}</Badge>
                      )}
                      {item.href === "/platform/tickets" && openTickets > 0 && (
                        <Badge variant="destructive" className="ms-auto h-5 px-1 text-xs">{openTickets}</Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="flex flex-col gap-0.5 mb-2" data-testid="sidebar-platform-user">
            <span className="text-sm font-medium" data-testid="text-platform-username">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
            </span>
            <span className="text-xs text-muted-foreground">{t.platformAdmin}</span>
          </div>
        )}
        <div className="text-xs text-muted-foreground">SalesBot AI v1.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}

function LogoutButton() {
  const { logoutMutation } = useAuth();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      data-testid="button-platform-logout"
    >
      {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
    </Button>
  );
}

function PlatformLanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
      data-testid="button-platform-language-toggle"
      className="flex items-center gap-1 text-xs font-medium"
    >
      <Languages className="h-4 w-4" />
      {language === "ar" ? "EN" : "AR"}
    </Button>
  );
}

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className={`flex flex-1 overflow-hidden min-w-0 ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
        <PlatformSidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4 shrink-0">
            <SidebarTrigger data-testid="button-platform-sidebar-toggle" />
            <div className="flex items-center gap-2">
              {user && (
                <span className="text-sm text-muted-foreground hidden md:inline" data-testid="text-platform-header-user">
                  {user.firstName} {user.lastName}
                </span>
              )}
              <PlatformLanguageToggle />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6" dir={isRTL ? "rtl" : "ltr"}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
