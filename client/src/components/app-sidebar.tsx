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
  Kanban,
  Trophy,
  CalendarCheck,
  Upload,
  Copy,
  UserX,
  History,
  UserPlus,
  TrendingUp,
  Building2,
  PlayCircle,
  LifeBuoy,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useTour } from "@/hooks/use-tour";
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
import { ROLE_ARABIC_NAMES, type UserRole, normalizeRole, isPlatformAdmin } from "@shared/models/auth";
import { useQuery } from "@tanstack/react-query";

const isAdmin = (role: string | null | undefined): boolean => {
  return role === "super_admin" || role === "admin" || role === "sales_admin";
};

const isManager = (role: string | null | undefined): boolean => {
  return role === "super_admin" || role === "admin" || role === "sales_admin" || role === "sales_manager" || role === "company_owner" || role === "team_leader";
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const userRole = user?.role ? normalizeRole(user.role) : undefined;
  const { openTour } = useTour();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  // Adaptive Arabic labels: ecommerce uses order terminology, service uses lead terminology
  const lbl = {
    group: isEcommerce ? "الطلبات" : "الليدز",
    pipeline: isEcommerce ? "خط سير الطلبات" : "خط سير الليدز",
    all: isEcommerce ? "جميع الطلبات" : "جميع الليدز",
    mgmt: isEcommerce ? "إدارة الطلبات" : "إدارة الليدز",
    upload: isEcommerce ? "رفع الطلبات" : "رفع الليدز",
    add: isEcommerce ? "إضافة طلب" : "إضافة ليد",
    duplicates: isEcommerce ? "الطلبات المكررة" : "الليدز المكررة",
    withdrawn: isEcommerce ? "الطلبات المنسحبة" : "الليدز المنسحبة",
  };

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/manager-comments/unread-count"],
    refetchInterval: 30000,
    enabled: userRole === "sales_agent",
  });
  const unreadCount = unreadData?.count ?? 0;

  const isActive = (url: string) => location === url || location.startsWith(url + "/");

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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/" data-testid="link-nav-home">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>لوحة التحكم</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isManager(userRole) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/leaderboard")}>
                    <Link href="/leaderboard" data-testid="link-nav-leaderboard">
                      <Trophy className="h-4 w-4" />
                      <span>المتصدرين</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/analytics")}>
                  <Link href="/analytics" data-testid="link-nav-analytics">
                    <BarChart3 className="h-4 w-4" />
                    <span>التقارير</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isEcommerce ? (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/products")}>
                      <Link href="/products" data-testid="link-nav-products">
                        <Package className="h-4 w-4" />
                        <span>المنتجات</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/orders")}>
                      <Link href="/orders" data-testid="link-nav-orders">
                        <ShoppingBag className="h-4 w-4" />
                        <span>الطلبات</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/activity-log")}>
                      <Link href="/activity-log" data-testid="link-nav-activity-log">
                        <History className="h-4 w-4" />
                        <span>سجل الإجراءات</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    {lbl.group}
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/leads/pipeline")}>
                          <Link href="/leads/pipeline" data-testid="link-nav-pipeline">
                            <Kanban className="h-4 w-4" />
                            <span>{lbl.pipeline}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location === "/leads"}>
                          <Link href="/leads" data-testid="link-nav-leads">
                            <Users className="h-4 w-4" />
                            <span>{lbl.all}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/follow-ups")}>
                          <Link href="/follow-ups" data-testid="link-nav-follow-ups">
                            <CalendarCheck className="h-4 w-4" />
                            <span>متابعات اليوم</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            <SidebarGroup>
              <Collapsible className="group/collapsible">
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    {lbl.mgmt}
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {isManager(userRole) && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive("/leads/upload")}>
                            <Link href="/leads/upload" data-testid="link-nav-upload-leads">
                              <Upload className="h-4 w-4" />
                              <span>{lbl.upload}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/leads?action=add")}>
                          <Link href="/leads?action=add" data-testid="link-nav-add-lead">
                            <UserPlus className="h-4 w-4" />
                            <span>{lbl.add}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/leads/duplicates")}>
                          <Link href="/leads/duplicates" data-testid="link-nav-duplicates">
                            <Copy className="h-4 w-4" />
                            <span>{lbl.duplicates}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/leads/withdrawn")}>
                          <Link href="/leads/withdrawn" data-testid="link-nav-withdrawn">
                            <UserX className="h-4 w-4" />
                            <span>{lbl.withdrawn}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive("/activity-log")}>
                          <Link href="/activity-log" data-testid="link-nav-activity-log">
                            <History className="h-4 w-4" />
                            <span>سجل الإجراءات</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/knowledge-base")}>
                  <Link href="/knowledge-base" data-testid="link-nav-knowledge-base">
                    <BookOpen className="h-4 w-4" />
                    <span>قاعدة المعرفة</span>
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
                التواصل
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/conversations")}>
                      <Link href="/conversations" data-testid="link-nav-conversations">
                        <MessageSquare className="h-4 w-4" />
                        <span>واتساب</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/chatbot-config")}>
                      <Link href="/chatbot-config" data-testid="link-nav-chatbot-config">
                        <BotMessageSquare className="h-4 w-4" />
                        <span>إعدادات الشات بوت</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {isAdmin(userRole) && (
          <SidebarGroup>
            <Collapsible className="group/collapsible">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  الإدارة
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/integrations")}>
                        <Link href="/integrations" data-testid="link-nav-integrations">
                          <Plug className="h-4 w-4" />
                          <span>التكاملات</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/settings/users")}>
                        <Link href="/settings/users" data-testid="link-nav-settings-users">
                          <UsersRound className="h-4 w-4" />
                          <span>المستخدمين</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/settings")}>
                        <Link href="/settings" data-testid="link-nav-settings">
                          <Settings className="h-4 w-4" />
                          <span>الإعدادات</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {!isPlatformAdmin(userRole) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/support/tickets")}>
                    <Link href="/support/tickets" data-testid="link-nav-support">
                      <LifeBuoy className="h-4 w-4" />
                      <span>الدعم الفني</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isPlatformAdmin(userRole) && (
          <SidebarGroup>
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Sales CRM المنصة
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/platform"}>
                        <Link href="/platform" data-testid="link-nav-platform-dashboard">
                          <LayoutDashboard className="h-4 w-4" />
                          <span>لوحة تحكم المنصة</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/platform/leads/pipeline")}>
                        <Link href="/platform/leads/pipeline" data-testid="link-nav-platform-pipeline">
                          <Kanban className="h-4 w-4" />
                          <span>Pipeline المبيعات</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/platform/leads"}>
                        <Link href="/platform/leads" data-testid="link-nav-platform-leads">
                          <Building2 className="h-4 w-4" />
                          <span>ليدز المنصة</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/analytics")}>
                        <Link href="/analytics" data-testid="link-nav-platform-analytics">
                          <TrendingUp className="h-4 w-4" />
                          <span>التقارير</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
        <div className="border-t pt-2 mb-1">
          <button
            onClick={openTour}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            data-testid="button-replay-tour"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span>جولة تعريفية</span>
          </button>
        </div>
        <div className="text-xs text-muted-foreground">SalesBot AI v1.0</div>
      </SidebarFooter>
    </Sidebar>
  );
}
