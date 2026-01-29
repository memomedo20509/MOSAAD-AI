import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FolderKanban, MapPin, Calendar, Home, Loader2 } from "lucide-react";
import type { Project, Developer, InsertProject } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

const PROJECT_TYPES = ["Residential", "Commercial", "Mixed Use", "Retail", "Industrial"];
const PROJECT_STATUSES = [
  { value: "coming_soon", label: "Coming Soon", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "under_construction", label: "Under Construction", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "ready", label: "Ready", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Partial<InsertProject>>({});
  const [filterDeveloper, setFilterDeveloper] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: developers = [] } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsAddOpen(false);
      setFormData({});
      toast({ title: t.projectCreatedSuccess });
    },
    onError: () => {
      toast({ title: t.projectCreatedError, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProject(null);
      setFormData({});
      toast({ title: t.projectUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.projectUpdatedError, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: t.projectDeletedSuccess });
    },
    onError: () => {
      toast({ title: t.projectDeletedError, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertProject);
    }
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      developerId: project.developerId || undefined,
      type: project.type || "",
      location: project.location || "",
      address: project.address || "",
      description: project.description || "",
      status: project.status || "under_construction",
      totalUnits: project.totalUnits || 0,
      deliveryDate: project.deliveryDate || "",
      minPrice: project.minPrice || undefined,
      maxPrice: project.maxPrice || undefined,
      isActive: project.isActive ?? true,
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingProject(null);
  };

  const filteredProjects = projects.filter((project) => {
    if (filterDeveloper !== "all" && project.developerId !== filterDeveloper) return false;
    if (filterStatus !== "all" && project.status !== filterStatus) return false;
    return true;
  });

  const getDeveloperName = (developerId: string | null) => {
    if (!developerId) return "Unknown";
    const developer = developers.find((d) => d.id === developerId);
    return developer?.name || "Unknown";
  };

  const getStatusBadge = (status: string | null) => {
    const statusInfo = PROJECT_STATUSES.find((s) => s.value === status);
    if (!statusInfo) return null;
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ProjectForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t.projectName} *</Label>
        <Input
          id="name"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          data-testid="input-project-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="developerId">{t.developer}</Label>
        <Select value={formData.developerId || ""} onValueChange={(value) => setFormData({ ...formData, developerId: value || undefined })}>
          <SelectTrigger data-testid="select-project-developer">
            <SelectValue placeholder={t.selectDeveloper} />
          </SelectTrigger>
          <SelectContent>
            {developers.map((developer) => (
              <SelectItem key={developer.id} value={developer.id}>
                {developer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">{t.type}</Label>
          <Select value={formData.type || ""} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger data-testid="select-project-type">
              <SelectValue placeholder={t.type} />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">{t.status}</Label>
          <Select value={formData.status || "under_construction"} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger data-testid="select-project-status">
              <SelectValue placeholder={t.status} />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">{t.location}</Label>
        <Input
          id="location"
          value={formData.location || ""}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          data-testid="input-project-location"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">{t.address}</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          data-testid="input-project-address"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="totalUnits">{t.unitsCount}</Label>
          <Input
            id="totalUnits"
            type="number"
            value={formData.totalUnits || ""}
            onChange={(e) => setFormData({ ...formData, totalUnits: parseInt(e.target.value) || 0 })}
            data-testid="input-project-total-units"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minPrice">{t.price}</Label>
          <Input
            id="minPrice"
            type="number"
            value={formData.minPrice || ""}
            onChange={(e) => setFormData({ ...formData, minPrice: parseInt(e.target.value) || undefined })}
            data-testid="input-project-min-price"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPrice">{t.price}</Label>
          <Input
            id="maxPrice"
            type="number"
            value={formData.maxPrice || ""}
            onChange={(e) => setFormData({ ...formData, maxPrice: parseInt(e.target.value) || undefined })}
            data-testid="input-project-max-price"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deliveryDate">{t.date}</Label>
        <Input
          id="deliveryDate"
          value={formData.deliveryDate || ""}
          onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
          placeholder="e.g., Q4 2025"
          data-testid="input-project-delivery-date"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t.description}</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid="input-project-description"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive ?? true}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          data-testid="switch-project-active"
        />
        <Label htmlFor="isActive">{t.active}</Label>
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t.projectsTitle}</h1>
          <p className="text-muted-foreground">{t.projectsSubtitle}</p>
        </div>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-project">
                <Plus className="mr-2 h-4 w-4" />
                {t.addProject}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.addProject}</DialogTitle>
              </DialogHeader>
              <ProjectForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filterDeveloper} onValueChange={setFilterDeveloper}>
          <SelectTrigger className="w-48" data-testid="filter-developer">
            <SelectValue placeholder={t.developer} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.developers}</SelectItem>
            {developers.map((developer) => (
              <SelectItem key={developer.id} value={developer.id}>
                {developer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="filter-status">
            <SelectValue placeholder={t.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStates}</SelectItem>
            {PROJECT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t.noProjectsFound}</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setIsAddOpen(true)} data-testid="button-add-first-project">
                <Plus className="mr-2 h-4 w-4" />
                {t.addProject}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className={!project.isActive ? "opacity-60" : ""} data-testid={`card-project-${project.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate" data-testid={`text-project-name-${project.id}`}>
                    {project.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{getDeveloperName(project.developerId)}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Dialog open={editingProject?.id === project.id} onOpenChange={(open) => { if (!open) resetForm(); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(project)} data-testid={`button-edit-project-${project.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t.editProject}</DialogTitle>
                        </DialogHeader>
                        <ProjectForm />
                      </DialogContent>
                    </Dialog>
                    {isSuperAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-delete-project-${project.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteProject}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.deleteProjectConfirm} "{project.name}"
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(project.id)} data-testid="button-confirm-delete-project">
                              {t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {getStatusBadge(project.status)}
                  {project.type && <Badge variant="outline">{project.type}</Badge>}
                </div>
                {project.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location}</span>
                  </div>
                )}
                {project.deliveryDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{project.deliveryDate}</span>
                  </div>
                )}
                {project.totalUnits && project.totalUnits > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Home className="h-4 w-4" />
                    <span>{project.totalUnits} {t.units}</span>
                  </div>
                )}
                {(project.minPrice || project.maxPrice) && (
                  <p className="text-muted-foreground">
                    {t.price}: {project.minPrice?.toLocaleString()} - {project.maxPrice?.toLocaleString()} EGP
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link href={`/inventory/projects/${project.id}/units`} className="w-full">
                  <Button variant="outline" className="w-full" data-testid={`button-view-units-${project.id}`}>
                    {t.viewUnits}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
