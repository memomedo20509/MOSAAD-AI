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
import type { UserRole } from "@shared/models/auth";

const mainNavItems = [
  {
    title: "لوحة التحكم",
    url: "/",
    icon: LayoutDashboard,
  },
];

const salesItems = [
  {
    title: "جميع العملاء المحتملين",
    url: "/leads",
    icon: Users,
  },
];

const adminItems = [
  {
    title: "إضافة عميل جديد",
    url: "/leads/new",
    icon: UserPlus,
  },
  {
    title: "رفع العملاء",
    url: "/leads/upload",
    icon: Upload,
  },
  {
    title: "العملاء المكررين",
    url: "/leads/duplicated",
    icon: Copy,
  },
  {
    title: "العملاء المنسحبين",
    url: "/leads/withdrawn",
    icon: FileX,
  },
  {
    title: "سجل الإجراءات",
    url: "/leads/actions",
    icon: Activity,
  },
];

const inventoryItems = [
  {
    title: "المطورين",
    url: "/inventory/developers",
    icon: Landmark,
  },
  {
    title: "المشاريع",
    url: "/inventory/projects",
    icon: FolderKanban,
  },
  {
    title: "الوحدات",
    url: "/inventory/units",
    icon: Home,
  },
];

const settingsItems = [
  {
    title: "إدارة الحالات",
    url: "/settings/states",
    icon: Settings,
    adminOnly: false,
  },
  {
    title: "الفلاتر المحفوظة",
    url: "/settings/filters",
    icon: Filter,
    adminOnly: false,
  },
  {
    title: "المستخدمين",
    url: "/settings/users",
    icon: UsersRound,
    adminOnly: true,
  },
  {
    title: "الفرق",
    url: "/settings/teams",
    icon: Users,
    adminOnly: true,
  },
];

const isAdmin = (role: UserRole | undefined): boolean => {
  return role === "super_admin" || role === "admin";
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const userRole = user?.role as UserRole | undefined;
  const filteredSettingsItems = settingsItems.filter(
    (item) => !item.adminOnly || isAdmin(userRole)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg" data-testid="text-app-name">HomeAdvisor CRM</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
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
                المبيعات
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {salesItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
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
                إدارة العملاء
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
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
                  المخزون
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {inventoryItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
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
          <SidebarGroupLabel>العملاء</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/clients"}>
                  <Link href="/clients" data-testid="link-nav-clients">
                    <Users className="h-4 w-4" />
                    <span>جميع العملاء</span>
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
                الإعدادات
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredSettingsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
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
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          HomeAdvisor CRM v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
