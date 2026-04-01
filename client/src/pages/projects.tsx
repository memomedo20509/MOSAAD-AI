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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, FolderKanban, MapPin, Calendar, Home, Loader2,
  Search, Building2, DollarSign, Eye, ExternalLink, CheckCircle2,
  CreditCard, X, Filter, ChevronDown,
} from "lucide-react";
import type { Project, Developer, InsertProject } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  delivered:        { label: "تم التسليم", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", icon: "✅" },
  under_construction: { label: "تحت الإنشاء", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100", icon: "🔨" },
  near_delivery:    { label: "قريب التسليم", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100", icon: "📅" },
  coming_soon:      { label: "قريباً", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100", icon: "🚀" },
  ready:            { label: "جاهز", color: "bg-green-100 text-green-800", icon: "✅" },
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

function formatPrice(p: number | null): string {
  if (!p) return "";
  if (p >= 1000000) return `${(p / 1000000).toFixed(1)} م`;
  return p.toLocaleString();
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const preselectedDev = urlParams.get("developer") || "all";

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Partial<InsertProject>>({});
  const [filterDeveloper, setFilterDeveloper] = useState(preselectedDev);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnitType, setFilterUnitType] = useState("all");
  const [filterDelivery, setFilterDelivery] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: developers = [] } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });

  const createMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setIsAddOpen(false); setFormData({}); toast({ title: t.projectCreatedSuccess }); },
    onError: () => toast({ title: t.projectCreatedError, variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) => apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setEditingProject(null); setFormData({}); toast({ title: t.projectUpdatedSuccess }); },
    onError: () => toast({ title: t.projectUpdatedError, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setSelectedProject(null); toast({ title: t.projectDeletedSuccess }); },
    onError: () => toast({ title: t.projectDeletedError, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) updateMutation.mutate({ id: editingProject.id, data: formData });
    else createMutation.mutate(formData as InsertProject);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({ name: project.name, developerId: project.developerId || undefined, type: project.type || "", location: project.location || "", address: project.address || "", description: project.description || "", status: project.status || "under_construction", totalUnits: project.totalUnits || 0, deliveryDate: project.deliveryDate || "", minPrice: project.minPrice || undefined, maxPrice: project.maxPrice || undefined, isActive: project.isActive ?? true });
  };
  const resetForm = () => { setFormData({}); setEditingProject(null); };

  const getDeveloperName = (devId: string | null) => developers.find(d => d.id === devId)?.name || "غير محدد";

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (!p.isActive) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !getDeveloperName(p.developerId).includes(search)) return false;
      if (filterDeveloper !== "all" && p.developerId !== filterDeveloper) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterDelivery !== "all" && p.deliveryDate !== filterDelivery) return false;
      if (filterUnitType !== "all") {
        const types = extractUnitTypes(p.description);
        if (!types.includes(filterUnitType)) return false;
      }
      return true;
    }).sort((a, b) => {
      const aHasDesc = (a.description?.length || 0) > 200 ? 1 : 0;
      const bHasDesc = (b.description?.length || 0) > 200 ? 1 : 0;
      return bHasDesc - aHasDesc;
    });
  }, [projects, search, filterDeveloper, filterStatus, filterDelivery, filterUnitType, developers]);

  const deliveryYears = useMemo(() => [...new Set(projects.map(p => p.deliveryDate).filter(Boolean))].sort(), [projects]);

  const activeFiltersCount = [filterDeveloper !== "all", filterStatus !== "all", filterDelivery !== "all", filterUnitType !== "all"].filter(Boolean).length;

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
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-project">
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingProject ? t.update : t.create}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.projectsTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {filteredProjects.length} من أصل {projects.filter(p => p.isActive).length} مشروع
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

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم الكمبوند أو المطور..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10"
              data-testid="input-search-project"
            />
          </div>
          <Button
            variant={activeFiltersCount > 0 ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 ml-1" />
            فلاتر {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="icon" onClick={() => { setFilterDeveloper("all"); setFilterStatus("all"); setFilterDelivery("all"); setFilterUnitType("all"); setSearch(""); }} data-testid="button-clear-filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-xs">المطور</Label>
              <Select value={filterDeveloper} onValueChange={setFilterDeveloper}>
                <SelectTrigger className="h-8 text-sm" data-testid="filter-developer"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المطورين</SelectItem>
                  {developers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الحالة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-sm" data-testid="filter-status"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">نوع الوحدة</Label>
              <Select value={filterUnitType} onValueChange={setFilterUnitType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {["شقة","فيلا","توين هاوس","تاون هاوس","دوبلكس","بنتهاوس","إستوديو","مكتب","تجاري"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">سنة التسليم</Label>
              <Select value={filterDelivery} onValueChange={setFilterDelivery}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل السنوات</SelectItem>
                  {deliveryYears.map(y => <SelectItem key={y!} value={y!}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([v, c]) => {
          const count = filteredProjects.filter(p => p.status === v).length;
          if (!count) return null;
          return <span key={v}>{c.icon} {c.label}: <strong>{count}</strong></span>;
        })}
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">لا توجد مشاريع مطابقة</p>
            <p className="text-muted-foreground text-sm mt-1">جرب تغيير الفلاتر أو البحث</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              developerName={getDeveloperName(project.developerId)}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              onEdit={openEditDialog}
              onDelete={id => deleteMutation.mutate(id)}
              onViewDetails={() => setSelectedProject(project)}
              editingProject={editingProject}
              resetForm={resetForm}
              ProjectForm={ProjectForm}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={o => { if (!o) setSelectedProject(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="left">
          {selectedProject && <ProjectDetailPanel project={selectedProject} developerName={getDeveloperName(selectedProject.developerId)} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onEdit={() => { openEditDialog(selectedProject); setSelectedProject(null); }} onDelete={() => deleteMutation.mutate(selectedProject.id)} t={t} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ProjectCard({ project, developerName, isAdmin, isSuperAdmin, onEdit, onDelete, onViewDetails, editingProject, resetForm, ProjectForm, t }: any) {
  const unitTypes = extractUnitTypes(project.description);
  const paymentPlans = extractPaymentPlans(project.description);
  const statusInfo = STATUS_CONFIG[project.status || "under_construction"] || STATUS_CONFIG.under_construction;
  const nawyUrl = extractNawyUrl(project.description);
  const projectImage = project.images?.[0];

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow group overflow-hidden" data-testid={`card-project-${project.id}`}>
      {/* Project image */}
      {projectImage && (
        <div className="h-36 overflow-hidden bg-muted relative">
          <img
            src={projectImage}
            alt={project.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
          <div className="absolute top-2 left-2">
            <Badge className={`text-xs border-0 ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
          </div>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight mb-1" data-testid={`text-project-name-${project.id}`}>{project.name}</CardTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />{developerName}
              </span>
              {project.location && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{project.location}
                </span>
              )}
            </div>
          </div>
          {!projectImage && (
            <div className="flex gap-1 shrink-0">
              <Badge className={`text-xs border-0 ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {/* Price range */}
        {(project.minPrice || project.maxPrice) && (
          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950 rounded-md px-2.5 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              {project.minPrice ? `${formatPrice(project.minPrice)} جم` : ""}
              {project.minPrice && project.maxPrice ? " – " : ""}
              {project.maxPrice && project.maxPrice !== project.minPrice ? `${formatPrice(project.maxPrice)} جم` : ""}
            </span>
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
            <span className="line-clamp-2">{paymentPlans.split(' | ').slice(0, 2).join(' | ')}{paymentPlans.split(' | ').length > 2 ? ' ...' : ''}</span>
          </div>
        )}

        {/* Delivery date */}
        {project.deliveryDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>التسليم: {project.deliveryDate === "2025" && project.status === "delivered" ? "تم التسليم" : project.deliveryDate}</span>
          </div>
        )}

        {/* Amenities */}
        {project.amenities && project.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.amenities.slice(0, 3).map((a: string) => (
              <span key={a} className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">{a}</span>
            ))}
            {project.amenities.length > 3 && <span className="text-xs text-muted-foreground">+{project.amenities.length - 3} مزايا</span>}
          </div>
        )}
      </CardContent>

      <div className="border-t px-4 py-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails} data-testid={`button-view-details-${project.id}`}>
          <Eye className="h-3.5 w-3.5 ml-1" />التفاصيل
        </Button>
        <Link href={`/inventory/projects/${project.id}/units`} className="flex-1">
          <Button size="sm" className="w-full" data-testid={`button-view-units-${project.id}`}>
            <Home className="h-3.5 w-3.5 ml-1" />الوحدات
          </Button>
        </Link>
        {isAdmin && (
          <div className="flex gap-1">
            <Dialog open={editingProject?.id === project.id} onOpenChange={o => { if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(project)} data-testid={`button-edit-project-${project.id}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t.editProject}</DialogTitle></DialogHeader>
                {editingProject?.id === project.id && <ProjectForm />}
              </DialogContent>
            </Dialog>
            {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-delete-project-${project.id}`}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>حذف المشروع؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف "{project.name}" نهائياً</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(project.id)} data-testid="button-confirm-delete-project">{t.delete}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ProjectDetailPanel({ project, developerName, isAdmin, isSuperAdmin, onEdit, onDelete, t }: any) {
  const unitRanges = extractUnitRanges(project.description);
  const paymentPlans = extractPaymentPlans(project.description);
  const aboutText = extractAboutText(project.description);
  const nawyUrl = extractNawyUrl(project.description);
  const statusInfo = STATUS_CONFIG[project.status || "under_construction"] || STATUS_CONFIG.under_construction;

  return (
    <div className="space-y-5">
      <SheetHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SheetTitle className="text-xl leading-tight">{project.name}</SheetTitle>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />{developerName}
              {project.location && <><MapPin className="h-3.5 w-3.5 mr-1" />{project.location}</>}
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
            <p className="text-xs text-muted-foreground">نطاق الأسعار</p>
            <p className="font-bold text-green-700 dark:text-green-300">
              {project.minPrice ? `${formatPrice(project.minPrice)} جم` : ""}
              {project.minPrice && project.maxPrice ? " — " : ""}
              {project.maxPrice ? `${formatPrice(project.maxPrice)} جم` : ""}
            </p>
          </div>
          {project.deliveryDate && (
            <div className="mr-auto">
              <p className="text-xs text-muted-foreground">التسليم</p>
              <p className="font-semibold text-sm">{project.deliveryDate}</p>
            </div>
          )}
        </div>
      )}

      {/* Unit types with ranges */}
      {unitRanges.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Home className="h-4 w-4" />أنواع الوحدات</p>
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
          <p className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />أنظمة السداد</p>
          <div className="space-y-1.5">
            {paymentPlans.split(' | ').map((plan, i) => (
              <div key={i} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 rounded-md px-3 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="text-sm">{plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      {project.amenities && project.amenities.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">المميزات والخدمات</p>
          <div className="flex flex-wrap gap-2">
            {project.amenities.map((a: string) => (
              <span key={a} className="text-xs bg-muted rounded-full px-3 py-1">{a}</span>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* About text */}
      {aboutText && aboutText.length > 50 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">عن الكمبوند</p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aboutText}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link href={`/inventory/projects/${project.id}/units`} className="flex-1">
          <Button className="w-full" data-testid="button-view-units-detail">
            <Home className="h-4 w-4 ml-2" />عرض الوحدات
          </Button>
        </Link>
        {nawyUrl && (
          <a href={nawyUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 ml-2" />عرض على nawy
            </Button>
          </a>
        )}
        {isAdmin && (
          <>
            <Button variant="outline" size="icon" onClick={onEdit} data-testid="button-edit-detail">
              <Pencil className="h-4 w-4" />
            </Button>
            {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-delete-detail">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>حذف المشروع؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>{t.delete}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </div>
  );
}
