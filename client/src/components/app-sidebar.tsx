import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  MessageSquare,
  Mail,
  Trophy,
  Megaphone,
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
import { ROLE_ARABIC_NAMES, type UserRole } from "@shared/models/auth";

const isAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin" || role === "admin" || role === "sales_admin";
};

const isManager = (role: string | null | undefined): boolean => {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "company_owner"
  );
};

const isSuperAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin";
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const userRole = user?.role as UserRole | undefined;
  const perms = user?.permissions;

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

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/manager-comments/unread-count"],
    refetchInterval: 30000,
    enabled: userRole === "sales_agent",
  });
  const unreadCount = unreadData?.count ?? 0;

  const { data: waUnreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/whatsapp/inbox/unread-count"],
    refetchInterval: 15000,
  });
  const waUnreadCount = waUnreadData?.count ?? 0;

  const canAccessMyDay = !perms || perms.canAccessMyDay !== false;
  const canAccessLeaderboard = !perms || perms.canAccessLeaderboard !== false;
  const canAccessReports = !perms || perms.canAccessReports !== false;
  const canAccessInventory = !perms || perms.canAccessInventory !== false;
  const canAccessWhatsapp = !perms || perms.canAccessWhatsapp !== false;
  const canAccessCampaigns = !perms || perms.canAccessCampaigns !== false;
  const canAccessCommissions = !perms || perms.canAccessCommissions !== false;
  const canAccessSettings = !perms || perms.canAccessSettings !== false;
  const canAccessKanban = !perms || perms.canAccessKanban !== false;

  const mainNavItems = [
    {
      title: t.dashboard,
      url: "/",
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: t.leaderboard,
      url: "/leaderboard",
      icon: Trophy,
      show: canAccessLeaderboard,
    },
    {
      title: t.reports,
      url: "/reports",
      icon: BarChart3,
      show: canAccessReports,
    },
  ].filter(item => item.show);

  const salesItems = [
    {
      title: t.kanbanBoard,
      url: "/kanban",
      icon: Kanban,
      show: canAccessKanban,
    },
    {
      title: t.allLeads,
      url: "/leads",
      icon: Users,
      show: true,
    },
    {
      title: t.myDay,
      url: "/my-day",
      icon: Sun,
      badge: pendingActionsCount > 0 ? pendingActionsCount : null,
      show: canAccessMyDay,
    },
  ].filter(item => item.show);

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
      title: "واتساب",
      url: "/settings/whatsapp",
      icon: MessageSquare,
      adminOnly: false,
    },
    {
      title: "قوالب واتساب",
      url: "/settings/whatsapp/templates",
      icon: MessageSquare,
      adminOnly: true,
    },
    {
      title: "فيسبوك وإنستجرام",
      url: "/settings/meta",
      icon: MessageSquare,
      adminOnly: true,
    },
    {
      title: t.emailReports,
      url: "/settings/email-reports",
      icon: Mail,
      adminOnly: false,
      managerOnly: true,
    },
    {
      title: t.users,
      url: "/settings/users",
      icon: UsersRound,
      adminOnly: true,
      managerOnly: false,
    },
    {
      title: t.teams,
      url: "/settings/teams",
      icon: Users,
      adminOnly: true,
      managerOnly: false,
    },
  ];

  const filteredSettingsItems = settingsItems.filter((item) => {
    if (item.adminOnly && !isAdmin(userRole)) return false;
    if (item.managerOnly && !isManager(userRole)) return false;
    return true;
  });

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
                      <SidebarMenuButton asChild isActive={
                        location === item.url ||
                        (item.url === "/kanban" && location.startsWith("/kanban")) ||
                        (item.url === "/leads" && location.startsWith("/leads") && location !== "/leads/new" && location !== "/leads/upload" && location !== "/leads/duplicated" && location !== "/leads/withdrawn" && location !== "/leads/actions")
                      }>
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

        {canAccessInventory && (
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

        {canAccessWhatsapp && (
          <SidebarGroup>
            <SidebarGroupLabel>التواصل</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/whatsapp-inbox"}>
                    <Link href="/whatsapp-inbox" data-testid="link-nav-whatsapp-inbox">
                      <MessageSquare className="h-4 w-4" />
                      <span className="flex-1">صندوق بريد واتساب</span>
                      {waUnreadCount > 0 && (
                        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] flex items-center justify-center" data-testid="badge-whatsapp-unread-sidebar">
                          {waUnreadCount > 99 ? "99+" : waUnreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {canAccessCampaigns && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/whatsapp-campaigns"}>
                      <Link href="/whatsapp-campaigns" data-testid="link-nav-whatsapp-campaigns">
                        <Megaphone className="h-4 w-4" />
                        <span>حملات واتساب</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
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
              {canAccessCommissions && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/commissions"}>
                    <Link href="/commissions" data-testid="link-nav-commissions">
                      <DollarSign className="h-4 w-4" />
                      <span>{t.commissionsTitle}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(canAccessSettings || isSuperAdmin(userRole)) && (
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
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="mb-2 flex items-start justify-between gap-2" data-testid="sidebar-user-profile">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate" data-testid="text-sidebar-username">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.username}
              </span>
              <span className="text-xs text-muted-foreground" data-testid="text-sidebar-role">
                {userRole ? ROLE_ARABIC_NAMES[userRole] ?? user.role : user.role}
              </span>
            </div>
            {unreadCount > 0 && (
              <div className="relative flex-shrink-0" title="ملاحظات المانجر غير مقروءة" data-testid="badge-unread-manager-comments">
                <Bell className="h-5 w-5 text-amber-500" />
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {t.appName} - {t.version}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
