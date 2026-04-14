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
} from "lucide-react";
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
import { ROLE_ARABIC_NAMES, type UserRole, normalizeRole } from "@shared/models/auth";

const isAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin" || role === "admin";
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role ? normalizeRole(user.role) : undefined;

  const mainNavItems = [
    { title: "Overview", url: "/", icon: LayoutDashboard },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
  ];

  const botItems = [
    { title: "Conversations", url: "/conversations", icon: MessageSquare },
    { title: "Leads", url: "/leads", icon: Users },
    { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
  ];

  const adminItems = isAdmin(userRole) ? [
    { title: "Users", url: "/settings/users", icon: UsersRound },
    { title: "Settings", url: "/settings", icon: Settings },
  ] : [];

  return (
    <Sidebar>
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
          <div className="flex flex-col gap-0.5" data-testid="sidebar-user-profile">
            <span className="text-sm font-medium truncate" data-testid="text-sidebar-username">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
            </span>
            <span className="text-xs text-muted-foreground" data-testid="text-sidebar-role">
              {userRole ? (ROLE_ARABIC_NAMES[userRole] ?? user.role) : user.role}
            </span>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-2">SalesBot AI v1.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}
