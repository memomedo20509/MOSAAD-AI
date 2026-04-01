import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, FolderKanban, MapPin, Calendar, Home, Loader2,
  Search, Building2, DollarSign, Eye, ExternalLink, CheckCircle2,
  CreditCard, X, LayoutGrid, List, ArrowUpDown, ChevronDown, Filter,
} from "lucide-react";
import type { Project, Developer, InsertProject } from "@shared/schema";
import { useLanguage, getLocalizedName } from "@/lib/i18n";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  delivered:          { label: "تم التسليم",    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",  icon: "✅" },
  under_construction: { label: "تحت الإنشاء",   color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100", icon: "🔨" },
  near_delivery:      { label: "قريب التسليم",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",    icon: "📅" },
  coming_soon:        { label: "قريباً",         color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100", icon: "🚀" },
  ready:              { label: "جاهز",           color: "bg-green-100 text-green-800", icon: "✅" },
};

const UNIT_TYPE_COLORS: Record<string, string> = {
  "شقة":       "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-100",
  "فيلا":      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-100",
  "توين هاوس": "bg-pink-50 text-pink-700 border-pink-200",
  "تاون هاوس": "bg-rose-50 text-rose-700 border-rose-200",
  "دوبلكس":    "bg-orange-50 text-orange-700 border-orange-200",
  "بنتهاوس":   "bg-yellow-50 text-yellow-700 border-yellow-200",
  "إستوديو":   "bg-teal-50 text-teal-700 border-teal-200",
  "مكتب":      "bg-slate-50 text-slate-700 border-slate-200",
  "تجاري":     "bg-gray-50 text-gray-700 border-gray-200",
};

const COMMON_AMENITIES = [
  "مسبح", "جيم", "نادي رياضي", "مسجد", "مدرسة", "مول تجاري",
  "ملاعب", "حديقة", "أمن 24 ساعة", "نادي اجتماعي", "منطقة ترفيهية",
];

function extractUnitTypes(description: string | null): string[] {
  if (!description) return [];
  const types = ["شقة","فيلا","توين هاوس","تاون هاوس","دوبلكس","بنتهاوس","إستوديو","لوفت","مكتب","شاليه","تجاري"];
  return types.filter(t => description.includes(t));
}

function extractPaymentPlans(description: string | null): string {
  if (!description) return "";
  const m = description.match(/📋 أنظمة السداد:\n(.+?)(?:\n\n|$)/s);
  return m ? m[1].trim() : "";
}

function extractInstallmentOptions(description: string | null): { downPayments: number[]; years: number[] } {
  const empty = { downPayments: [], years: [] };
  if (!description) return empty;
  const m = description.match(/📋 أنظمة السداد:\n(.+?)(?:\n\n|$)/s);
  if (!m) return empty;
  const plans = m[1].split(/\s*\|\s*/);
  const downPayments: number[] = [];
  const years: number[] = [];
  for (const plan of plans) {
    const dpMatch = plan.match(/(\d+)%\s*مقدم/);
    if (dpMatch) downPayments.push(parseInt(dpMatch[1]));
    const yrMatch = plan.match(/(\d+)\s*سنو/);
    if (yrMatch) years.push(parseInt(yrMatch[1]));
  }
  return { downPayments, years };
}

function extractUnitRanges(description: string | null): Array<{type: string; range: string; price: string}> {
  if (!description) return [];
  const m = description.match(/🏠 أنواع الوحدات وأسعارها:\n([\s\S]+?)(?:\n\n🔗|$)/);
  if (!m) return [];
  return m[1].split('\n').filter(Boolean).map(line => {
    const parts = line.split(': ');
    if (parts.length < 2) return null;
    const type = parts[0];
    const rest = parts[1].split(' | ');
    return { type, range: rest[0] || '', price: rest[1] || '' };
  }).filter(Boolean) as Array<{type: string; range: string; price: string}>;
}

function extractNawyUrl(description: string | null): string {
  if (!description) return "";
  const m = description.match(/🔗 المصدر: (https?:\/\/[^\n]+)/);
  return m ? m[1].trim() : "";
}

function extractAboutText(description: string | null): string {
  if (!description) return "";
  const parts = description.split('\n📋');
  const about = parts[0].trim();
  return about.startsWith('عن ') ? about : about;
}

function formatPrice(p: number | null, lang: "ar" | "en" = "ar"): string {
  if (!p) return "";
  const currency = lang === "ar" ? "جنيه" : "EGP";
  return `${p.toLocaleString()} ${currency}`;
}

type SortOption = "newest" | "price_asc" | "price_desc" | "delivery" | "name";

interface ProjectCardProps {
  project: Project;
  developerName: string;
  displayName: string;
  displayLocation: string;
  onViewDetails: () => void;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const preselectedDev = urlParams.get("developer") || "all";

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertProject>>({});
  const [filterDeveloper, setFilterDeveloper] = useState(preselectedDev);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnitType, setFilterUnitType] = useState("all");
  const [filterDelivery, setFilterDelivery] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMaxDownPayment, setFilterMaxDownPayment] = useState("all");
  const [filterMinYears, setFilterMinYears] = useState("all");
  const [filterAmenities, setFilterAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: developers = [] } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });

  const createMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsAddOpen(false);
      setFormData({});
      toast({ title: t.projectCreatedSuccess });
    },
    onError: () => toast({ title: t.projectCreatedError, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData as InsertProject);
  };

  const resetForm = () => { setFormData({}); };

  const getDeveloperName = (devId: string | null) => {
    const dev = developers.find(d => d.id === devId);
    if (!dev) return language === "en" ? "Unknown" : "غير محدد";
    return getLocalizedName(dev.name, dev.nameEn, language);
  };

  const getProjectDisplayName = (project: Project) =>
    getLocalizedName(project.name, project.nameEn, language);

  const getProjectLocation = (project: Project) => {
    if (language === "en" && project.locationEn) return project.locationEn;
    return project.location || "";
  };

  const locations = useMemo(
    () => [...new Set(projects.map(p => p.location).filter(Boolean))].sort() as string[],
    [projects]
  );
  const deliveryYears = useMemo(
    () => [...new Set(projects.map(p => p.deliveryDate).filter(Boolean))].sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const minP = filterMinPrice ? parseInt(filterMinPrice) * 1000000 : null;
    const maxP = filterMaxPrice ? parseInt(filterMaxPrice) * 1000000 : null;
    const maxDP = filterMaxDownPayment !== "all" ? parseInt(filterMaxDownPayment) : null;
    const minYrs = filterMinYears !== "all" ? parseInt(filterMinYears) : null;

    const result = projects.filter(p => {
      if (!p.isActive) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !getDeveloperName(p.developerId).includes(search)) return false;
      if (filterDeveloper !== "all" && p.developerId !== filterDeveloper) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterDelivery !== "all" && p.deliveryDate !== filterDelivery) return false;
      if (filterLocation !== "all" && p.location !== filterLocation) return false;
      if (filterUnitType !== "all") {
        const types = extractUnitTypes(p.description);
        if (!types.includes(filterUnitType)) return false;
      }
      if (minP !== null) {
        if (!p.maxPrice) return false;
        if (p.maxPrice < minP) return false;
      }
      if (maxP !== null) {
        if (!p.minPrice) return false;
        if (p.minPrice > maxP) return false;
      }
      if (maxDP !== null) {
        const { downPayments } = extractInstallmentOptions(p.description);
        if (!downPayments.some(dp => dp <= maxDP)) return false;
      }
      if (minYrs !== null) {
        const { years } = extractInstallmentOptions(p.description);
        if (!years.some(y => y >= minYrs)) return false;
      }
      if (filterAmenities.length > 0) {
        const pAmenities = p.amenities || [];
        if (!filterAmenities.every(a => pAmenities.includes(a))) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":  return (a.minPrice || 0) - (b.minPrice || 0);
        case "price_desc": return (b.minPrice || 0) - (a.minPrice || 0);
        case "delivery":   return (a.deliveryDate || "9999").localeCompare(b.deliveryDate || "9999");
        case "name":       return a.name.localeCompare(b.name, "ar");
        default: {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        }
      }
    });
  }, [projects, search, filterDeveloper, filterStatus, filterDelivery, filterUnitType,
    filterLocation, filterMinPrice, filterMaxPrice, filterMaxDownPayment, filterMinYears,
    filterAmenities, sortBy, developers]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (search) chips.push({ key: "search", label: `بحث: ${search}`, onRemove: () => setSearch("") });
    if (filterDeveloper !== "all") chips.push({ key: "developer", label: getDeveloperName(filterDeveloper), onRemove: () => setFilterDeveloper("all") });
    if (filterStatus !== "all") chips.push({ key: "status", label: STATUS_CONFIG[filterStatus]?.label || filterStatus, onRemove: () => setFilterStatus("all") });
    if (filterUnitType !== "all") chips.push({ key: "unitType", label: filterUnitType, onRemove: () => setFilterUnitType("all") });
    if (filterDelivery !== "all") chips.push({ key: "delivery", label: `تسليم ${filterDelivery}`, onRemove: () => setFilterDelivery("all") });
    if (filterLocation !== "all") chips.push({ key: "location", label: filterLocation, onRemove: () => setFilterLocation("all") });
    if (filterMinPrice) chips.push({ key: "minPrice", label: `من ${filterMinPrice} م`, onRemove: () => setFilterMinPrice("") });
    if (filterMaxPrice) chips.push({ key: "maxPrice", label: `إلى ${filterMaxPrice} م`, onRemove: () => setFilterMaxPrice("") });
    if (filterMaxDownPayment !== "all") chips.push({ key: "downPayment", label: `مقدم ≤${filterMaxDownPayment}%`, onRemove: () => setFilterMaxDownPayment("all") });
    if (filterMinYears !== "all") chips.push({ key: "years", label: `${filterMinYears}+ سنوات`, onRemove: () => setFilterMinYears("all") });
    filterAmenities.forEach(a => chips.push({ key: `amenity-${a}`, label: a, onRemove: () => setFilterAmenities(prev => prev.filter(x => x !== a)) }));
    const sortLabels: Record<SortOption, string> = { newest: "الأحدث", price_asc: "السعر تصاعدي", price_desc: "السعر تنازلي", delivery: "سنة التسليم", name: "الاسم أبجدياً" };
    if (sortBy !== "newest") chips.push({ key: "sort", label: `ترتيب: ${sortLabels[sortBy]}`, onRemove: () => setSortBy("newest") });
    return chips;
  }, [search, filterDeveloper, filterStatus, filterUnitType, filterDelivery, filterLocation,
    filterMinPrice, filterMaxPrice, filterMaxDownPayment, filterMinYears, filterAmenities, sortBy, developers]);

  const clearAllFilters = () => {
    setSearch(""); setFilterDeveloper("all"); setFilterStatus("all"); setFilterUnitType("all");
    setFilterDelivery("all"); setFilterLocation("all"); setFilterMinPrice(""); setFilterMaxPrice("");
    setFilterMaxDownPayment("all"); setFilterMinYears("all"); setFilterAmenities([]);
    setSortBy("newest");
  };

  if (projectsLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const ProjectForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t.projectName} *</Label>
        <Input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required data-testid="input-project-name" />
      </div>
      <div className="space-y-2">
        <Label>{t.developer}</Label>
        <Select value={formData.developerId || ""} onValueChange={v => setFormData({ ...formData, developerId: v || undefined })}>
          <SelectTrigger data-testid="select-project-developer"><SelectValue placeholder={t.selectDeveloper} /></SelectTrigger>
          <SelectContent>{developers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.status}</Label>
          <Select value={formData.status || "under_construction"} onValueChange={v => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.date} التسليم</Label>
          <Input value={formData.deliveryDate || ""} onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })} placeholder="2025" data-testid="input-project-delivery-date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t.location}</Label>
        <Input value={formData.location || ""} onChange={e => setFormData({ ...formData, location: e.target.value })} data-testid="input-project-location" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>أقل سعر (جم)</Label>
          <Input type="number" value={formData.minPrice || ""} onChange={e => setFormData({ ...formData, minPrice: parseInt(e.target.value) || undefined })} data-testid="input-project-min-price" />
        </div>
        <div className="space-y-2">
          <Label>أعلى سعر (جم)</Label>
          <Input type="number" value={formData.maxPrice || ""} onChange={e => setFormData({ ...formData, maxPrice: parseInt(e.target.value) || undefined })} data-testid="input-project-max-price" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t.description}</Label>
        <Textarea rows={6} value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} data-testid="input-project-description" />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={formData.isActive ?? true} onCheckedChange={c => setFormData({ ...formData, isActive: c })} data-testid="switch-project-active" />
        <Label>{t.active}</Label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-project">
          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.create}
        </Button>
      </DialogFooter>
    </form>
  );

  const activeProjectsCount = projects.filter(p => p.isActive).length;
  const deliveredCount = filteredProjects.filter(p => p.status === "delivered").length;
  const underConstructionCount = filteredProjects.filter(p => p.status === "under_construction").length;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.projectsTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {filteredProjects.length} من أصل {activeProjectsCount} مشروع
            {filterDeveloper !== "all" && ` • ${getDeveloperName(filterDeveloper)}`}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-project"><Plus className="mr-2 h-4 w-4" />{t.addProject}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t.addProject}</DialogTitle></DialogHeader>
              <ProjectForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {deliveredCount} تم التسليم
        </span>
        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          {underConstructionCount} تحت الإنشاء
        </span>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث باسم الكمبوند أو المطور..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
          data-testid="input-search-project"
        />
      </div>

      {/* Filter row 1: developer, status, unit type, delivery */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Select value={filterDeveloper} onValueChange={setFilterDeveloper}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-developer">
            <SelectValue placeholder="كل المطورين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المطورين</SelectItem>
            {developers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-status">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterUnitType} onValueChange={setFilterUnitType}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-unit-type">
            <SelectValue placeholder="كل الأنواع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            {["شقة","فيلا","توين هاوس","تاون هاوس","دوبلكس","بنتهاوس","إستوديو","مكتب","تجاري"].map(tp => (
              <SelectItem key={tp} value={tp}>{tp}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDelivery} onValueChange={setFilterDelivery}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-delivery">
            <SelectValue placeholder="كل السنوات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل السنوات</SelectItem>
            {deliveryYears.map(y => <SelectItem key={y!} value={y!}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Filter row 2: location, down payment %, years, amenities */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-location">
            <MapPin className="h-3.5 w-3.5 ml-1 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="كل المناطق" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المناطق</SelectItem>
            {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterMaxDownPayment} onValueChange={setFilterMaxDownPayment}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-down-payment">
            <CreditCard className="h-3.5 w-3.5 ml-1 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="أقساط: المقدم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المقدمات</SelectItem>
            <SelectItem value="5">مقدم ≤ 5%</SelectItem>
            <SelectItem value="10">مقدم ≤ 10%</SelectItem>
            <SelectItem value="15">مقدم ≤ 15%</SelectItem>
            <SelectItem value="20">مقدم ≤ 20%</SelectItem>
            <SelectItem value="25">مقدم ≤ 25%</SelectItem>
            <SelectItem value="30">مقدم ≤ 30%</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterMinYears} onValueChange={setFilterMinYears}>
          <SelectTrigger className="h-9 text-sm" data-testid="filter-years">
            <Calendar className="h-3.5 w-3.5 ml-1 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="عدد السنوات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل السنوات</SelectItem>
            <SelectItem value="5">5 سنوات +</SelectItem>
            <SelectItem value="6">6 سنوات +</SelectItem>
            <SelectItem value="7">7 سنوات +</SelectItem>
            <SelectItem value="8">8 سنوات +</SelectItem>
            <SelectItem value="10">10 سنوات +</SelectItem>
            <SelectItem value="12">12 سنة +</SelectItem>
          </SelectContent>
        </Select>

        {/* Amenities multiselect */}
        <Popover open={amenitiesOpen} onOpenChange={setAmenitiesOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 text-sm justify-between font-normal w-full"
              data-testid="filter-amenities"
            >
              <span className="flex items-center gap-1 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                {filterAmenities.length > 0
                  ? `${filterAmenities.length} مرفق محدد`
                  : "المرافق"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              {COMMON_AMENITIES.map(amenity => (
                <label
                  key={amenity}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={filterAmenities.includes(amenity)}
                    onCheckedChange={checked => {
                      setFilterAmenities(prev =>
                        checked ? [...prev, amenity] : prev.filter(a => a !== amenity)
                      );
                    }}
                    data-testid={`checkbox-amenity-${amenity}`}
                  />
                  {amenity}
                </label>
              ))}
              {filterAmenities.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs mt-1"
                  onClick={() => setFilterAmenities([])}
                >
                  مسح المرافق
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter row 3: price range, sort, view toggles */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          <Input
            type="number"
            placeholder="أقل سعر (م)"
            value={filterMinPrice}
            onChange={e => setFilterMinPrice(e.target.value)}
            className="h-9 text-sm w-28"
            data-testid="filter-min-price"
          />
          <Input
            type="number"
            placeholder="أعلى سعر (م)"
            value={filterMaxPrice}
            onChange={e => setFilterMaxPrice(e.target.value)}
            className="h-9 text-sm w-28"
            data-testid="filter-max-price"
          />
        </div>

        <Select value={sortBy} onValueChange={v => {
          const valid: SortOption[] = ["newest","price_asc","price_desc","delivery","name"];
          if (valid.includes(v as SortOption)) setSortBy(v as SortOption);
        }}>
          <SelectTrigger className="h-9 text-sm w-40" data-testid="filter-sort">
            <ArrowUpDown className="h-3.5 w-3.5 ml-1 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="price_asc">السعر تصاعدي</SelectItem>
            <SelectItem value="price_desc">السعر تنازلي</SelectItem>
            <SelectItem value="delivery">سنة التسليم</SelectItem>
            <SelectItem value="name">الاسم أبجدياً</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 mr-auto">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
          {activeChips.length > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearAllFilters} data-testid="button-clear-all-filters">
              <X className="h-3.5 w-3.5 ml-1" />مسح الكل
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="active-filter-chips">
          {activeChips.map(chip => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="text-xs gap-1 pl-2 cursor-pointer hover:bg-muted"
              onClick={chip.onRemove}
              data-testid={`chip-${chip.key}`}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.noProjectsFound}</p>
            {activeChips.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>{t.clearFilters}</Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              developerName={getDeveloperName(project.developerId)}
              displayName={getProjectDisplayName(project)}
              displayLocation={getProjectLocation(project)}
              onViewDetails={() => setSelectedProject(project)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProjects.map(project => (
            <ProjectListRow
              key={project.id}
              project={project}
              developerName={getDeveloperName(project.developerId)}
              displayName={getProjectDisplayName(project)}
              displayLocation={getProjectLocation(project)}
              onViewDetails={() => setSelectedProject(project)}
            />
          ))}
        </div>
      )}

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={o => { if (!o) setSelectedProject(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="left">
          {selectedProject && (
            <ProjectDetailPanel
              project={selectedProject}
              developerName={getDeveloperName(selectedProject.developerId)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProjectCard({ project, developerName, displayName, displayLocation, onViewDetails }: ProjectCardProps) {
  const { language } = useLanguage();
  const unitTypes = extractUnitTypes(project.description);
  const paymentPlans = extractPaymentPlans(project.description);
  const statusInfo = STATUS_CONFIG[project.status || "under_construction"] || STATUS_CONFIG.under_construction;
  const projectImage = project.images?.[0];
  const amenitiesDisplay = (language === "en" && project.amenitiesEn?.length ? project.amenitiesEn : project.amenities) || [];

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow group overflow-hidden" data-testid={`card-project-${project.id}`}>
      {/* Project image */}
      {projectImage && (
        <div className="h-40 overflow-hidden bg-muted relative">
          <img
            src={projectImage}
            alt={displayName}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-2 left-2">
            <Badge className={`text-xs border-0 shadow-sm ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
          </div>
          {project.totalUnits && (
            <div className="absolute top-2 right-2">
              <Badge className="text-xs border-0 bg-black/60 text-white shadow-sm">{project.totalUnits} {language === "en" ? "units" : "وحدة"}</Badge>
            </div>
          )}
          {project.deliveryDate && (
            <div className="absolute bottom-2 right-2">
              <span className="text-xs font-semibold text-white bg-black/50 rounded px-2 py-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />{project.deliveryDate}
              </span>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight mb-1" data-testid={`text-project-name-${project.id}`}>{displayName}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />{developerName}
              </span>
              {displayLocation && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{displayLocation}
                </span>
              )}
            </div>
          </div>
          {!projectImage && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className={`text-xs border-0 ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
              {project.totalUnits && (
                <span className="text-xs text-muted-foreground">{project.totalUnits} وحدة</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {/* Price range */}
        {(project.minPrice || project.maxPrice) && (
          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950 rounded-md px-2.5 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              {project.minPrice ? formatPrice(project.minPrice, language) : ""}
              {project.minPrice && project.maxPrice ? " – " : ""}
              {project.maxPrice && project.maxPrice !== project.minPrice ? formatPrice(project.maxPrice, language) : ""}
            </span>
          </div>
        )}

        {/* Delivery date (when no image) */}
        {!projectImage && project.deliveryDate && (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium text-blue-700 dark:text-blue-300">التسليم: {project.deliveryDate}</span>
          </div>
        )}

        {/* Unit types */}
        {unitTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {unitTypes.slice(0, 5).map(type => (
              <Badge key={type} variant="outline" className={`text-xs ${UNIT_TYPE_COLORS[type] || ''}`}>{type}</Badge>
            ))}
            {unitTypes.length > 5 && <Badge variant="outline" className="text-xs">+{unitTypes.length - 5}</Badge>}
          </div>
        )}

        {/* Payment plans */}
        {paymentPlans && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
            <span className="line-clamp-2">
              {paymentPlans.split(' | ').slice(0, 2).join(' | ')}
              {paymentPlans.split(' | ').length > 2 ? ' ...' : ''}
            </span>
          </div>
        )}

        {/* Amenities */}
        {amenitiesDisplay.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {amenitiesDisplay.slice(0, 3).map((a: string) => (
              <span key={a} className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">{a}</span>
            ))}
            {amenitiesDisplay.length > 3 && (
              <span className="text-xs text-muted-foreground">+{amenitiesDisplay.length - 3} {language === "en" ? "amenities" : "مزايا"}</span>
            )}
          </div>
        )}
      </CardContent>

      <div className="border-t px-4 py-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails} data-testid={`button-view-details-${project.id}`}>
          <Eye className="h-3.5 w-3.5 ml-1" />{language === "en" ? "Details" : "التفاصيل"}
        </Button>
        <Link href={`/inventory/projects/${project.id}/units`} className="flex-1">
          <Button size="sm" className="w-full" data-testid={`button-view-units-${project.id}`}>
            <Home className="h-3.5 w-3.5 ml-1" />{language === "en" ? "Units" : "الوحدات"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ProjectListRow({ project, developerName, displayName, displayLocation, onViewDetails }: ProjectCardProps) {
  const { language } = useLanguage();
  const unitTypes = extractUnitTypes(project.description);
  const statusInfo = STATUS_CONFIG[project.status || "under_construction"] || STATUS_CONFIG.under_construction;
  const projectImage = project.images?.[0];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow group"
      data-testid={`row-project-${project.id}`}
    >
      {/* Thumbnail */}
      <div className="w-16 h-14 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {projectImage && !imgError ? (
          <img
            src={projectImage}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Building2 className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Name + developer + location */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate" data-testid={`text-row-project-name-${project.id}`}>{displayName}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5"><Building2 className="h-3 w-3" />{developerName}</span>
          {displayLocation && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{displayLocation}</span>}
        </p>
      </div>

      {/* Price */}
      <div className="hidden md:block w-40 shrink-0 text-right">
        {(project.minPrice || project.maxPrice) ? (
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            {project.minPrice ? formatPrice(project.minPrice, language) : ""}
            {project.minPrice && project.maxPrice ? " – " : ""}
            {project.maxPrice && project.maxPrice !== project.minPrice ? formatPrice(project.maxPrice, language) : ""}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">—</p>
        )}
      </div>

      {/* Status badge */}
      <div className="hidden sm:block shrink-0">
        <Badge className={`text-xs border-0 ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
      </div>

      {/* Delivery year */}
      <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16 justify-center">
        {project.deliveryDate && <><Calendar className="h-3 w-3" /><span>{project.deliveryDate}</span></>}
      </div>

      {/* Unit types */}
      <div className="hidden xl:flex flex-wrap gap-1 w-36 shrink-0">
        {unitTypes.slice(0, 3).map(type => (
          <Badge key={type} variant="outline" className={`text-xs ${UNIT_TYPE_COLORS[type] || ''}`}>{type}</Badge>
        ))}
        {unitTypes.length > 3 && <Badge variant="outline" className="text-xs">+{unitTypes.length - 3}</Badge>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onViewDetails} data-testid={`button-row-details-${project.id}`}>
          <Eye className="h-3 w-3 ml-1" />تفاصيل
        </Button>
        <Link href={`/inventory/projects/${project.id}/units`}>
          <Button size="sm" className="h-7 text-xs px-2" data-testid={`button-row-units-${project.id}`}>
            <Home className="h-3 w-3 ml-1" />الوحدات
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ProjectDetailPanel({ project, developerName }: { project: Project; developerName: string }) {
  const { language } = useLanguage();
  const unitRanges = extractUnitRanges(project.description);
  const paymentPlans = extractPaymentPlans(project.description);
  const aboutText = language === "en" && project.descriptionEn
    ? project.descriptionEn
    : extractAboutText(project.description);
  const nawyUrl = extractNawyUrl(project.description);
  const statusInfo = STATUS_CONFIG[project.status || "under_construction"] || STATUS_CONFIG.under_construction;
  const displayName = getLocalizedName(project.name, project.nameEn, language);
  const displayLocation = (language === "en" && project.locationEn) ? project.locationEn : project.location;
  const amenitiesDisplay = (language === "en" && project.amenitiesEn?.length ? project.amenitiesEn : project.amenities) || [];

  return (
    <div className="space-y-5">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle className="text-xl leading-tight">{displayName}</SheetTitle>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />{developerName}
              {displayLocation && <><MapPin className="h-3.5 w-3.5 mr-1" />{displayLocation}</>}
            </p>
          </div>
          <Badge className={`text-xs border-0 shrink-0 ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
        </div>
      </SheetHeader>

      {/* Price range */}
      {(project.minPrice || project.maxPrice) && (
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-xs text-muted-foreground">{language === "en" ? "Price Range" : "نطاق الأسعار"}</p>
            <p className="font-bold text-green-700 dark:text-green-300">
              {project.minPrice ? formatPrice(project.minPrice, language) : ""}
              {project.minPrice && project.maxPrice ? " — " : ""}
              {project.maxPrice && project.maxPrice !== project.minPrice ? formatPrice(project.maxPrice, language) : ""}
            </p>
          </div>
          {project.deliveryDate && (
            <div className="mr-auto">
              <p className="text-xs text-muted-foreground">{language === "en" ? "Delivery" : "التسليم"}</p>
              <p className="font-semibold text-sm">{project.deliveryDate}</p>
            </div>
          )}
          {project.totalUnits && (
            <div>
              <p className="text-xs text-muted-foreground">{language === "en" ? "Total Units" : "إجمالي الوحدات"}</p>
              <p className="font-semibold text-sm">{project.totalUnits}</p>
            </div>
          )}
        </div>
      )}

      {/* Unit types with ranges */}
      {unitRanges.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Home className="h-4 w-4" />{language === "en" ? "Unit Types" : "أنواع الوحدات"}</p>
          <div className="space-y-2">
            {unitRanges.map(({ type, range, price }) => (
              <div key={type} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <Badge variant="outline" className={`text-xs ${UNIT_TYPE_COLORS[type] || ''}`}>{type}</Badge>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{range}</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">{price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment plans */}
      {paymentPlans && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />{language === "en" ? "Payment Plans" : "أنظمة السداد"}</p>
          <div className="space-y-1.5">
            {paymentPlans.split(' | ').map((plan: string, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 rounded-md px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-sm">{plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      {amenitiesDisplay.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{language === "en" ? "Amenities & Services" : "المميزات والخدمات"}</p>
          <div className="flex flex-wrap gap-2">
            {amenitiesDisplay.map((a: string) => (
              <span key={a} className="text-xs bg-muted rounded-full px-3 py-1">{a}</span>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* About text */}
      {aboutText && aboutText.length > 50 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{language === "en" ? "About This Project" : "عن الكمبوند"}</p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aboutText}</p>
        </div>
      )}

      {/* Actions - view only */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link href={`/inventory/projects/${project.id}/units`} className="flex-1">
          <Button className="w-full" data-testid="button-view-units-detail">
            <Home className="h-4 w-4 ml-2" />{language === "en" ? "View Units" : "عرض الوحدات"}
          </Button>
        </Link>
        {nawyUrl && (
          <a href={nawyUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 ml-2" />{language === "en" ? "View on Nawy" : "عرض على nawy"}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
