import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Building2, Phone, Mail, MapPin,
  Loader2, Search, FolderKanban, ChevronRight,
} from "lucide-react";
import type { Developer, InsertDeveloper, Project } from "@shared/schema";
import { useLanguage, getLocalizedName } from "@/lib/i18n";

export default function DevelopersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [formData, setFormData] = useState<Partial<InsertDeveloper>>({});
  const [search, setSearch] = useState("");
  const [selectedDev, setSelectedDev] = useState<Developer | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: developers = [], isLoading } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const projectCountByDev = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => { if (p.developerId) map[p.developerId] = (map[p.developerId] || 0) + 1; });
    return map;
  }, [projects]);

  const devProjects = useMemo(() => {
    if (!selectedDev) return [];
    return projects.filter(p => p.developerId === selectedDev.id);
  }, [selectedDev, projects]);

  const getDevDisplayName = (dev: Developer) => getLocalizedName(dev.name, dev.nameEn, language);
  const getDevDescription = (dev: Developer) =>
    language === "en" && dev.descriptionEn ? dev.descriptionEn : (dev.description || "");

  const filtered = useMemo(() =>
    developers
      .filter(d => {
        const q = search.toLowerCase();
        const nameToSearch = language === "en"
          ? (d.nameEn || d.name || "")
          : (d.name || "");
        return nameToSearch.toLowerCase().includes(q) ||
          (d.description || "").toLowerCase().includes(q) ||
          (d.nameEn || "").toLowerCase().includes(q);
      })
      .sort((a, b) => (projectCountByDev[b.id] || 0) - (projectCountByDev[a.id] || 0)),
    [developers, search, projectCountByDev, language]
  );

  const createMutation = useMutation({
    mutationFn: (data: InsertDeveloper) => apiRequest("POST", "/api/developers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/developers"] }); setIsAddOpen(false); setFormData({}); toast({ title: t.developerCreatedSuccess }); },
    onError: () => toast({ title: t.developerCreatedError, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Developer> }) => apiRequest("PATCH", `/api/developers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/developers"] }); setEditingDeveloper(null); setFormData({}); toast({ title: t.developerUpdatedSuccess }); },
    onError: () => toast({ title: t.developerUpdatedError, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/developers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/developers"] }); toast({ title: t.developerDeletedSuccess }); },
    onError: () => toast({ title: t.developerDeletedError, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDeveloper) updateMutation.mutate({ id: editingDeveloper.id, data: formData });
    else createMutation.mutate(formData as InsertDeveloper);
  };

  const openEditDialog = (dev: Developer) => {
    setEditingDeveloper(dev);
    setFormData({ name: dev.name, logo: dev.logo || "", phone: dev.phone || "", email: dev.email || "", website: dev.website || "", address: dev.address || "", description: dev.description || "", isActive: dev.isActive ?? true });
  };

  const resetForm = () => { setFormData({}); setEditingDeveloper(null); };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const DeveloperForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t.developerName} *</Label>
        <Input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} required data-testid="input-developer-name" />
      </div>
      <div className="space-y-2">
        <Label>رابط الشعار (URL)</Label>
        <Input value={formData.logo || ""} onChange={e => setFormData({ ...formData, logo: e.target.value })} placeholder="https://..." data-testid="input-developer-logo" />
        {formData.logo && (
          <img src={formData.logo} alt="logo preview" className="h-12 object-contain rounded border p-1" onError={e => (e.currentTarget.style.display = 'none')} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.phone}</Label>
          <Input value={formData.phone || ""} onChange={e => setFormData({ ...formData, phone: e.target.value })} data-testid="input-developer-phone" />
        </div>
        <div className="space-y-2">
          <Label>{t.email}</Label>
          <Input type="email" value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} data-testid="input-developer-email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t.website}</Label>
        <Input value={formData.website || ""} onChange={e => setFormData({ ...formData, website: e.target.value })} data-testid="input-developer-website" />
      </div>
      <div className="space-y-2">
        <Label>{t.address}</Label>
        <Input value={formData.address || ""} onChange={e => setFormData({ ...formData, address: e.target.value })} data-testid="input-developer-address" />
      </div>
      <div className="space-y-2">
        <Label>{t.description}</Label>
        <Textarea rows={4} value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} data-testid="input-developer-description" />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="isActive" checked={formData.isActive ?? true} onCheckedChange={c => setFormData({ ...formData, isActive: c })} data-testid="switch-developer-active" />
        <Label htmlFor="isActive">{t.active}</Label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-developer">
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingDeveloper ? t.update : t.create}
        </Button>
      </DialogFooter>
    </form>
  );

  const activeDevelopers = filtered.filter(d => d.isActive);
  const inactiveDevelopers = filtered.filter(d => !d.isActive);

  return (
    <div className="flex h-full gap-0">
      {/* Left: Developer list */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-6 transition-all ${selectedDev ? "max-w-[640px]" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.developersTitle}</h1>
            <p className="text-muted-foreground text-sm">{developers.length} مطور عقاري · {projects.length} مشروع</p>
          </div>
          {isAdmin && (
            <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-developer"><Plus className="mr-2 h-4 w-4" />{t.addDeveloper}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t.addDeveloper}</DialogTitle></DialogHeader>
                <DeveloperForm />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم المطور..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
            data-testid="input-search-developer"
          />
        </div>

        {/* Stats summary */}
        <div className="flex gap-3">
          {[
            { label: "مطور نشط", value: developers.filter(d => d.isActive).length, color: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "لديهم مشاريع", value: Object.keys(projectCountByDev).length, color: "bg-purple-50 text-purple-700 border-purple-200" },
          ].map(s => (
            <div key={s.label} className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${s.color}`}>
              {s.value} {s.label}
            </div>
          ))}
        </div>

        {/* Developer grid */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا يوجد مطورون مطابقون للبحث</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeDevelopers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">المطورون النشطون ({activeDevelopers.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeDevelopers.map(dev => (
                    <DevCard key={dev.id} dev={dev} projectCount={projectCountByDev[dev.id] || 0}
                      isSelected={selectedDev?.id === dev.id}
                      onSelect={() => setSelectedDev(dev.id === selectedDev?.id ? null : dev)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}
            {inactiveDevelopers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">غير نشط ({inactiveDevelopers.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-60">
                  {inactiveDevelopers.map(dev => (
                    <DevCard key={dev.id} dev={dev} projectCount={projectCountByDev[dev.id] || 0}
                      isSelected={selectedDev?.id === dev.id}
                      onSelect={() => setSelectedDev(dev.id === selectedDev?.id ? null : dev)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Developer detail panel */}
      {selectedDev && (
        <div className="w-96 border-r bg-muted/20 overflow-y-auto flex-shrink-0">
          <div className="sticky top-0 bg-background/95 backdrop-blur border-b p-4 flex items-center justify-between">
            <h2 className="font-semibold text-base">تفاصيل المطور</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDev(null)}>
              ✕
            </Button>
          </div>

          <div className="p-4 space-y-5">
            {/* Logo + Name header */}
            <div className="flex flex-col items-center text-center gap-3 py-4">
              {selectedDev.logo ? (
                <div className="w-28 h-28 rounded-2xl border bg-white flex items-center justify-center p-3 shadow-sm overflow-hidden">
                  <img src={selectedDev.logo} alt={getDevDisplayName(selectedDev)}
                    className="w-full h-full object-contain"
                    onError={e => {
                      const el = e.currentTarget.parentElement!;
                      el.innerHTML = `<div class="w-full h-full flex items-center justify-center"><span class="text-4xl font-bold text-primary/30">${selectedDev.name?.charAt(0) || '?'}</span></div>`;
                    }}
                  />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl border bg-primary/5 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary/30">{selectedDev.name?.charAt(0) || '?'}</span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{getDevDisplayName(selectedDev)}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge variant={selectedDev.isActive ? "default" : "secondary"}>
                    {selectedDev.isActive ? (language === "en" ? "Active" : "نشط") : (language === "en" ? "Inactive" : "غير نشط")}
                  </Badge>
                  {(projectCountByDev[selectedDev.id] || 0) > 0 && (
                    <Badge variant="outline" className="text-primary border-primary/30">
                      <FolderKanban className="h-3 w-3 ml-1" />
                      {projectCountByDev[selectedDev.id]} {language === "en" ? "projects" : "مشروع"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact info */}
            {(selectedDev.phone || selectedDev.email || selectedDev.address) && (
              <div className="rounded-xl border bg-card p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">معلومات التواصل</p>
                {selectedDev.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-green-500 shrink-0" />
                    <a href={`tel:${selectedDev.phone}`} className="hover:underline text-foreground">{selectedDev.phone}</a>
                  </div>
                )}
                {selectedDev.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                    <a href={`mailto:${selectedDev.email}`} className="hover:underline text-foreground">{selectedDev.email}</a>
                  </div>
                )}

                {selectedDev.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="text-foreground">{selectedDev.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {(selectedDev.description || selectedDev.descriptionEn) && (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {language === "en" ? "About" : "عن الشركة"}
                </p>
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                  {getDevDescription(selectedDev)}
                </p>
              </div>
            )}

            {/* Projects */}
            {devProjects.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {language === "en" ? `Projects (${devProjects.length})` : `المشاريع (${devProjects.length})`}
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {devProjects.map(p => (
                    <button key={p.id}
                      onClick={() => navigate(`/inventory/projects/${p.id}/units`)}
                      className="w-full text-right flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      data-testid={`link-project-${p.id}`}
                    >
                      {(p as any).images?.[0] ? (
                        <img src={(p as any).images[0]} alt={getLocalizedName(p.name, p.nameEn, language)} className="w-10 h-10 rounded-lg object-cover shrink-0 border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border">
                          <Building2 className="h-4 w-4 text-primary/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getLocalizedName(p.name, p.nameEn, language)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {language === "en" && p.locationEn ? p.locationEn : p.location}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-1">
              <Button className="w-full" onClick={() => navigate(`/inventory/projects?developer=${selectedDev.id}`)}>
                <FolderKanban className="h-4 w-4 ml-2" />
                كل مشاريع الشركة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DevCard({ dev, projectCount, isSelected, onSelect, language }: any) {
  const [imgError, setImgError] = useState(false);
  const displayName = getLocalizedName(dev.name, dev.nameEn, language);

  return (
    <div
      className={`group rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col ${isSelected ? "ring-2 ring-primary shadow-md" : ""}`}
      data-testid={`card-developer-${dev.id}`}
      onClick={onSelect}
    >
      {/* Logo area */}
      <div className="bg-white dark:bg-muted/30 flex items-center justify-center h-28 p-4 border-b relative">
        {dev.logo && !imgError ? (
          <img
            src={dev.logo}
            alt={displayName}
            className="max-h-20 max-w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary/40">{dev.name?.charAt(0) || '?'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-sm font-semibold leading-tight line-clamp-2" data-testid={`text-developer-name-${dev.id}`}>{displayName}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
          {projectCount > 0 ? (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              <FolderKanban className="h-3 w-3 ml-0.5" />{projectCount} {language === "en" ? "projects" : "مشروع"}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">{language === "en" ? "No projects" : "بدون مشاريع"}</span>
          )}
          {dev.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </div>
      </div>
    </div>
  );
}
