import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Phone, Mail, Globe, MapPin, Loader2, Search, FolderKanban, ChevronRight } from "lucide-react";
import type { Developer, InsertDeveloper, Project } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

export default function DevelopersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [formData, setFormData] = useState<Partial<InsertDeveloper>>({});
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: developers = [], isLoading } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const projectCountByDev = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach(p => { if (p.developerId) map[p.developerId] = (map[p.developerId] || 0) + 1; });
    return map;
  }, [projects]);

  const filtered = useMemo(() =>
    developers
      .filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (projectCountByDev[b.id] || 0) - (projectCountByDev[a.id] || 0)),
    [developers, search, projectCountByDev]
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
    setFormData({ name: dev.name, phone: dev.phone || "", email: dev.email || "", website: dev.website || "", address: dev.address || "", description: dev.description || "", isActive: dev.isActive ?? true });
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.developersTitle}</h1>
          <p className="text-muted-foreground">{developers.length} مطور عقاري | {projects.length} مشروع</p>
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

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث باسم المطور أو الوصف..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
          data-testid="input-search-developer"
        />
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDevelopers.map(dev => (
                  <DeveloperCard key={dev.id} dev={dev} projectCount={projectCountByDev[dev.id] || 0} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onEdit={openEditDialog} onDelete={id => deleteMutation.mutate(id)} onNavigate={() => navigate(`/inventory/projects?developer=${dev.id}`)} editingId={editingDeveloper?.id} resetForm={resetForm} DeveloperForm={DeveloperForm} t={t} />
                ))}
              </div>
            </div>
          )}
          {inactiveDevelopers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">غير نشط ({inactiveDevelopers.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactiveDevelopers.map(dev => (
                  <DeveloperCard key={dev.id} dev={dev} projectCount={projectCountByDev[dev.id] || 0} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onEdit={openEditDialog} onDelete={id => deleteMutation.mutate(id)} onNavigate={() => navigate(`/inventory/projects?developer=${dev.id}`)} editingId={editingDeveloper?.id} resetForm={resetForm} DeveloperForm={DeveloperForm} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeveloperCard({ dev, projectCount, isAdmin, isSuperAdmin, onEdit, onDelete, onNavigate, editingId, resetForm, DeveloperForm, t }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-developer-${dev.id}`} onClick={onNavigate}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold truncate" data-testid={`text-developer-name-${dev.id}`}>{dev.name}</CardTitle>
              {projectCount > 0 && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  <FolderKanban className="h-3 w-3 ml-1" />
                  {projectCount} مشروع
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {isAdmin && (
              <Dialog open={editingId === dev.id} onOpenChange={o => { if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(dev); }} data-testid={`button-edit-developer-${dev.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <DialogHeader><DialogTitle>{t.editDeveloper}</DialogTitle></DialogHeader>
                  <DeveloperForm />
                </DialogContent>
              </Dialog>
            )}
            {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} data-testid={`button-delete-developer-${dev.id}`}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={e => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.deleteDeveloper}?</AlertDialogTitle>
                    <AlertDialogDescription>{t.deleteDeveloperConfirm} "{dev.name}"</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(dev.id)} data-testid="button-confirm-delete-developer">{t.delete}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pb-3">
        {dev.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">{dev.description.split('\n')[0]}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {dev.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{dev.phone}</span>}
          {dev.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{dev.email}</span>}
          {dev.website && <a href={dev.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}><Globe className="h-3 w-3" />الموقع الرسمي</a>}
          {dev.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{dev.address}</span>}
        </div>
        {projectCount > 0 && (
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-xs text-primary font-medium">عرض المشاريع</span>
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
