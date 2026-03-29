import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  Copy,
  FileX,
  Activity,
  Settings,
  ChevronDown,
  Building2,
  Filter,
  UsersRound,
  Landmark,
  FolderKanban,
  Home,
  Kanban,
  BarChart3,
  Bell,
  DollarSign,
  Shield,
  Sun,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { ROLE_ARABIC_NAMES, type UserRole } from "@shared/models/auth";

const isAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin" || role === "admin" || role === "sales_admin";
};

const isSuperAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin";
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const userRole = user?.role as UserRole | undefined;

  const { data: myDayData } = useQuery<{
    todayFollowUps: unknown[];
    newLeads: unknown[];
    overdueFollowUps: unknown[];
  }>({
    queryKey: ["/api/my-day"],
    refetchInterval: 120_000,
  });

  const pendingActionsCount = (myDayData?.todayFollowUps.length ?? 0) +
    (myDayData?.overdueFollowUps.length ?? 0) +
    (myDayData?.newLeads.length ?? 0);

  const mainNavItems = [
    {
      title: t.dashboard,
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t.myDay,
      url: "/my-day",
      icon: Sun,
      badge: pendingActionsCount > 0 ? pendingActionsCount : null,
    },
    {
      title: t.kanbanBoard,
      url: "/kanban",
      icon: Kanban,
    },
    {
      title: t.reports,
      url: "/reports",
      icon: BarChart3,
    },
  ];

  const salesItems = [
    {
      title: t.allLeads,
      url: "/leads",
      icon: Users,
    },
  ];

  const adminItems = [
    {
      title: t.addNewLead,
      url: "/leads/new",
      icon: UserPlus,
    },
    {
      title: t.uploadLeads,
      url: "/leads/upload",
      icon: Upload,
    },
    {
      title: t.duplicatedLeads,
      url: "/leads/duplicated",
      icon: Copy,
    },
    {
      title: t.withdrawnLeads,
      url: "/leads/withdrawn",
      icon: FileX,
    },
    {
      title: t.actionsLog,
      url: "/leads/actions",
      icon: Activity,
    },
  ];

  const inventoryItems = [
    {
      title: t.developers,
      url: "/inventory/developers",
      icon: Landmark,
    },
    {
      title: t.projects,
      url: "/inventory/projects",
      icon: FolderKanban,
    },
    {
      title: t.units,
      url: "/inventory/units",
      icon: Home,
    },
  ];

  const settingsItems = [
    {
      title: t.statesManagement,
      url: "/settings/states",
      icon: Settings,
      adminOnly: false,
    },
    {
      title: t.savedFilters,
      url: "/settings/filters",
      icon: Filter,
      adminOnly: false,
    },
    {
      title: t.users,
      url: "/settings/users",
      icon: UsersRound,
      adminOnly: true,
    },
    {
      title: t.teams,
      url: "/settings/teams",
      icon: Users,
      adminOnly: true,
    },
  ];

  const filteredSettingsItems = settingsItems.filter(
    (item) => !item.adminOnly || isAdmin(userRole)
  );

  const permissionsLink = isSuperAdmin(userRole) ? {
    title: t.permissionsManagement,
    url: "/settings/permissions",
    icon: Shield,
  } : null;

  return (
    <Sidebar side={isRTL ? "right" : "left"}>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg" data-testid="text-app-name">{t.appName}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace(/\//g, "-").slice(1) || "home"}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {"badge" in item && item.badge ? (
                        <Badge variant="destructive" className="h-4 min-w-4 p-0 text-xs flex items-center justify-center" data-testid="badge-myday-sidebar">
                          {item.badge}
                        </Badge>
                      ) : null}
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
                {t.sales}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {salesItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location === item.url || (item.url === "/leads" && location.startsWith("/leads") && location !== "/leads/new" && location !== "/leads/upload" && location !== "/leads/duplicated" && location !== "/leads/withdrawn" && location !== "/leads/actions")}>
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

        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t.leadsAdmin}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
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

        {isAdmin(userRole) && (
          <SidebarGroup>
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  {t.inventory}
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {inventoryItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={location.startsWith(item.url)}>
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

        <SidebarGroup>
          <SidebarGroupLabel>{t.clients}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/clients"}>
                  <Link href="/clients" data-testid="link-nav-clients">
                    <Users className="h-4 w-4" />
                    <span>{t.allClients}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/commissions"}>
                  <Link href="/commissions" data-testid="link-nav-commissions">
                    <DollarSign className="h-4 w-4" />
                    <span>{t.commissionsTitle}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible className="group/collapsible">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t.settings}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredSettingsItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url} data-testid={`link-nav-${item.url.replace(/\//g, "-").slice(1)}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {permissionsLink && (
                    <SidebarMenuItem key={permissionsLink.url}>
                      <SidebarMenuButton asChild isActive={location === permissionsLink.url}>
                        <Link href={permissionsLink.url} data-testid="link-nav-settings-permissions">
                          <permissionsLink.icon className="h-4 w-4" />
                          <span>{permissionsLink.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="mb-2 flex flex-col gap-0.5" data-testid="sidebar-user-profile">
            <span className="text-sm font-medium truncate" data-testid="text-sidebar-username">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username}
            </span>
            <span className="text-xs text-muted-foreground" data-testid="text-sidebar-role">
              {userRole ? ROLE_ARABIC_NAMES[userRole] ?? user.role : user.role}
            </span>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {t.appName} - {t.version}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
