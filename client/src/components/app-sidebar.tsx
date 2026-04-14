import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  Bot,
  ChevronDown,
  UsersRound,
  Plug,
  BotMessageSquare,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { ROLE_ARABIC_NAMES, type UserRole, normalizeRole } from "@shared/models/auth";
import { useQuery } from "@tanstack/react-query";

const isAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin" || role === "admin" || role === "sales_admin";
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const userRole = user?.role ? normalizeRole(user.role) : undefined;

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/manager-comments/unread-count"],
    refetchInterval: 30000,
    enabled: userRole === "sales_agent",
  });
  const unreadCount = unreadData?.count ?? 0;

  const mainNavItems = [
    { title: "Overview", url: "/", icon: LayoutDashboard },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ];

  const botItems = [
    { title: "Conversations", url: "/conversations", icon: MessageSquare },
    { title: "Leads", url: "/leads", icon: Users },
    { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
    { title: "Chatbot Config", url: "/chatbot-config", icon: BotMessageSquare },
  ];

  const adminItems = isAdmin(userRole) ? [
    { title: "Integrations", url: "/integrations", icon: Plug },
    { title: "Users", url: "/settings/users", icon: UsersRound },
    { title: "Settings", url: "/settings", icon: Settings },
  ] : [];

  return (
    <Sidebar side={isRTL ? "right" : "left"}>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg" data-testid="text-app-name">SalesBot AI</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace(/\//g, "-").slice(1) || "home"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Chatbot
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {botItems.map(item => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location === item.url || location.startsWith(item.url + "/")}>
                        <Link href={item.url} data-testid={`link-nav-${item.url.replace(/\//g, "-").slice(1)}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            <Collapsible className="group/collapsible">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Administration
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map(item => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={location === item.url}>
                          <Link href={item.url} data-testid={`link-nav-${item.url.replace(/\//g, "-").slice(1)}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="mb-2 flex items-start justify-between gap-2" data-testid="sidebar-user-profile">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate" data-testid="text-sidebar-username">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </span>
              <span className="text-xs text-muted-foreground" data-testid="text-sidebar-role">
                {userRole ? (ROLE_ARABIC_NAMES[userRole] ?? user.role) : user.role}
              </span>
            </div>
            {unreadCount > 0 && (
              <div className="relative flex-shrink-0" title="Unread notifications" data-testid="badge-unread-notifications">
                <Bell className="h-5 w-5 text-amber-500" />
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-muted-foreground">SalesBot AI v1.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}
