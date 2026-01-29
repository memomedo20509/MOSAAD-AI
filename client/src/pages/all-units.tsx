import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Home, Loader2, LayoutGrid, List, Search, Building2 } from "lucide-react";
import type { Unit, Project, InsertUnit } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

const UNIT_TYPES = ["Apartment", "Studio", "Duplex", "Penthouse", "Villa", "Townhouse", "Office", "Shop", "Warehouse"];
const UNIT_STATUSES = [
  { value: "available", label: "Available", color: "bg-green-500" },
  { value: "reserved", label: "Reserved", color: "bg-yellow-500" },
  { value: "sold", label: "Sold", color: "bg-red-500" },
];
const FINISHING_OPTIONS = ["Core & Shell", "Semi-Finished", "Fully Finished", "Furnished"];

export default function AllUnitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<Partial<InsertUnit>>({});
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsAddOpen(false);
      setFormData({});
      toast({ title: t.unitCreatedSuccess });
    },
    onError: () => {
      toast({ title: t.unitCreatedError, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) =>
      apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setEditingUnit(null);
      setFormData({});
      toast({ title: t.unitUpdatedSuccess });
    },
    onError: () => {
      toast({ title: t.unitUpdatedError, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: t.unitDeletedSuccess });
    },
    onError: () => {
      toast({ title: t.unitDeletedError, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: formData });
    } else {
      if (!formData.projectId) {
        toast({ title: t.selectProject, variant: "destructive" });
        return;
      }
      createMutation.mutate(formData as InsertUnit);
    }
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      type: unit.type,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      area: unit.area,
      price: unit.price,
      status: unit.status,
      finishing: unit.finishing,
      notes: unit.notes,
      projectId: unit.projectId,
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingUnit(null);
  };

  const getStatusBadge = (status: string | null) => {
    const statusInfo = UNIT_STATUSES.find((s) => s.value === status) || UNIT_STATUSES[0];
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {status === "available" ? t.available : status === "reserved" ? t.reserved : t.sold}
      </Badge>
    );
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "-";
  };

  const filteredUnits = units.filter((unit) => {
    const matchesStatus = filterStatus === "all" || unit.status === filterStatus;
    const matchesProject = selectedProjectId === "all" || unit.projectId === selectedProjectId;
    const matchesSearch = 
      searchQuery === "" ||
      unit.unitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProjectName(unit.projectId).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesProject && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-units-title">
            {t.unitsTitle}
          </h1>
          <p className="text-muted-foreground">
            {t.manageUnitsSubtitle || t.unitsTitle}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-unit">
                <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t.addUnit}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.addUnit}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.project}</Label>
                    <Select
                      value={formData.projectId || ""}
                      onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                    >
                      <SelectTrigger data-testid="select-project">
                        <SelectValue placeholder={t.selectProject} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.unitNumber}</Label>
                    <Input
                      value={formData.unitNumber || ""}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      placeholder={t.unitNumber}
                      data-testid="input-unit-number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.floor}</Label>
                    <Input
                      type="number"
                      value={formData.floor ?? ""}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || undefined })}
                      placeholder={t.floor}
                      data-testid="input-floor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.type}</Label>
                    <Select
                      value={formData.type || ""}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger data-testid="select-type">
                        <SelectValue placeholder={t.selectType} />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.bedrooms}</Label>
                    <Input
                      type="number"
                      value={formData.bedrooms ?? ""}
                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || undefined })}
                      data-testid="input-bedrooms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.bathrooms}</Label>
                    <Input
                      type="number"
                      value={formData.bathrooms ?? ""}
                      onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || undefined })}
                      data-testid="input-bathrooms"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.area}</Label>
                    <Input
                      value={formData.area || ""}
                      onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || undefined })}
                      placeholder={t.area}
                      data-testid="input-area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.price}</Label>
                    <Input
                      value={formData.price || ""}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || undefined })}
                      placeholder={t.price}
                      data-testid="input-price"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.status}</Label>
                    <Select
                      value={formData.status || "available"}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.value === "available" ? t.available : status.value === "reserved" ? t.reserved : t.sold}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.finishing}</Label>
                    <Select
                      value={formData.finishing || ""}
                      onValueChange={(value) => setFormData({ ...formData, finishing: value })}
                    >
                      <SelectTrigger data-testid="select-finishing">
                        <SelectValue placeholder={t.selectFinishing} />
                      </SelectTrigger>
                      <SelectContent>
                        {FINISHING_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.notes}</Label>
                  <Textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t.notes}
                    data-testid="input-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                  {t.cancel}
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                  {t.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchUnits || t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
            data-testid="input-search-units"
          />
        </div>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[200px]" data-testid="filter-project">
            <SelectValue placeholder={t.allProjects || t.projects} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allProjects || t.projects}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" data-testid="filter-status">
            <SelectValue placeholder={t.allStatuses || t.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allStatuses || t.status}</SelectItem>
            {UNIT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.value === "available" ? t.available : status.value === "reserved" ? t.reserved : t.sold}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Units Display */}
      {filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t.noUnitsFound || t.noLeadsFound}</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.project}</TableHead>
                  <TableHead>{t.unitNumber}</TableHead>
                  <TableHead>{t.floor}</TableHead>
                  <TableHead>{t.type}</TableHead>
                  <TableHead>{t.bedrooms}</TableHead>
                  <TableHead>{t.bathrooms}</TableHead>
                  <TableHead>{t.area}</TableHead>
                  <TableHead>{t.price}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  {isAdmin && <TableHead>{t.actions}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
                    <TableCell>
                      <Link href={`/inventory/projects/${unit.projectId}/units`}>
                        <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {getProjectName(unit.projectId)}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{unit.unitNumber || "-"}</TableCell>
                    <TableCell>{unit.floor ?? "-"}</TableCell>
                    <TableCell>{unit.type || "-"}</TableCell>
                    <TableCell>{unit.bedrooms ?? "-"}</TableCell>
                    <TableCell>{unit.bathrooms ?? "-"}</TableCell>
                    <TableCell>{unit.area || "-"}</TableCell>
                    <TableCell>{unit.price || "-"}</TableCell>
                    <TableCell>{getStatusBadge(unit.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog open={editingUnit?.id === unit.id} onOpenChange={(open) => { if (!open) resetForm(); }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(unit)} data-testid={`button-edit-unit-${unit.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{t.editUnit}</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>{t.unitNumber}</Label>
                                    <Input
                                      value={formData.unitNumber || ""}
                                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t.floor}</Label>
                                    <Input
                                      type="number"
                                      value={formData.floor ?? ""}
                                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || undefined })}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>{t.type}</Label>
                                    <Select
                                      value={formData.type || ""}
                                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {UNIT_TYPES.map((type) => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t.status}</Label>
                                    <Select
                                      value={formData.status || "available"}
                                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {UNIT_STATUSES.map((status) => (
                                          <SelectItem key={status.value} value={status.value}>
                                            {status.value === "available" ? t.available : status.value === "reserved" ? t.reserved : t.sold}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>{t.bedrooms}</Label>
                                    <Input
                                      type="number"
                                      value={formData.bedrooms ?? ""}
                                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || undefined })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t.bathrooms}</Label>
                                    <Input
                                      type="number"
                                      value={formData.bathrooms ?? ""}
                                      onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || undefined })}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>{t.area}</Label>
                                    <Input
                                      value={formData.area || ""}
                                      onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || undefined })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t.price}</Label>
                                    <Input
                                      value={formData.price || ""}
                                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || undefined })}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>{t.notes}</Label>
                                  <Textarea
                                    value={formData.notes || ""}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={resetForm}>
                                  {t.cancel}
                                </Button>
                                <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                                  {t.update}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          {isSuperAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-delete-unit-${unit.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t.deleteUnitConfirmation}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(unit.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t.delete}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUnits.map((unit) => (
            <Card key={unit.id} className="hover-elevate" data-testid={`card-unit-${unit.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{unit.unitNumber || t.unit}</CardTitle>
                  {getStatusBadge(unit.status)}
                </div>
                <Link href={`/inventory/projects/${unit.projectId}/units`}>
                  <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {getProjectName(unit.projectId)}
                  </span>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.type}:</span> {unit.type || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.floor}:</span> {unit.floor ?? "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.bedrooms}:</span> {unit.bedrooms ?? "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.bathrooms}:</span> {unit.bathrooms ?? "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.area}:</span> {unit.area || "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.price}:</span> {unit.price || "-"}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex justify-end gap-1 mt-4">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(unit)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isSuperAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.deleteUnitConfirmation}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(unit.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
