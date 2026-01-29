import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
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
import { Plus, Pencil, Trash2, Home, ArrowLeft, Loader2, LayoutGrid, List } from "lucide-react";
import type { Unit, Project, InsertUnit } from "@shared/schema";

const UNIT_TYPES = ["Apartment", "Studio", "Duplex", "Penthouse", "Villa", "Townhouse", "Office", "Shop", "Warehouse"];
const UNIT_STATUSES = [
  { value: "available", label: "Available", color: "bg-green-500" },
  { value: "reserved", label: "Reserved", color: "bg-yellow-500" },
  { value: "sold", label: "Sold", color: "bg-red-500" },
];
const FINISHING_OPTIONS = ["Core & Shell", "Semi-Finished", "Fully Finished", "Furnished"];

export default function UnitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/inventory/projects/:projectId/units");
  const projectId = params?.projectId;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<Partial<InsertUnit>>({});
  const [viewMode, setViewMode] = useState<"grid" | "stacking">("stacking");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["/api/projects", projectId, "units"],
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "units"] });
      setIsAddOpen(false);
      setFormData({});
      toast({ title: "Unit created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create unit", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) =>
      apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "units"] });
      setEditingUnit(null);
      setFormData({});
      toast({ title: "Unit updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update unit", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "units"] });
      toast({ title: "Unit deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete unit", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, projectId } as InsertUnit);
    }
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      unitNumber: unit.unitNumber,
      floor: unit.floor || undefined,
      building: unit.building || "",
      type: unit.type || "",
      bedrooms: unit.bedrooms || undefined,
      bathrooms: unit.bathrooms || undefined,
      area: unit.area || undefined,
      price: unit.price || undefined,
      status: unit.status || "available",
      view: unit.view || "",
      finishing: unit.finishing || "",
      notes: unit.notes || "",
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingUnit(null);
  };

  const filteredUnits = units.filter((unit) => {
    if (filterStatus !== "all" && unit.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string | null) => {
    const statusInfo = UNIT_STATUSES.find((s) => s.value === status);
    return statusInfo?.color || "bg-gray-500";
  };

  const getStatusLabel = (status: string | null) => {
    const statusInfo = UNIT_STATUSES.find((s) => s.value === status);
    return statusInfo?.label || status;
  };

  const floors = [...new Set(filteredUnits.map((u) => u.floor).filter((f) => f !== null))].sort((a, b) => (b || 0) - (a || 0));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const UnitForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unitNumber">Unit Number *</Label>
          <Input
            id="unitNumber"
            value={formData.unitNumber || ""}
            onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
            required
            data-testid="input-unit-number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floor">Floor</Label>
          <Input
            id="floor"
            type="number"
            value={formData.floor || ""}
            onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || undefined })}
            data-testid="input-unit-floor"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="building">Building</Label>
          <Input
            id="building"
            value={formData.building || ""}
            onChange={(e) => setFormData({ ...formData, building: e.target.value })}
            data-testid="input-unit-building"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={formData.type || ""} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger data-testid="select-unit-type">
              <SelectValue placeholder="Select type" />
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
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            value={formData.bedrooms || ""}
            onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || undefined })}
            data-testid="input-unit-bedrooms"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            value={formData.bathrooms || ""}
            onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || undefined })}
            data-testid="input-unit-bathrooms"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area (sqm)</Label>
          <Input
            id="area"
            type="number"
            value={formData.area || ""}
            onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || undefined })}
            data-testid="input-unit-area"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            value={formData.price || ""}
            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || undefined })}
            data-testid="input-unit-price"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status || "available"} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger data-testid="select-unit-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="view">View</Label>
          <Input
            id="view"
            value={formData.view || ""}
            onChange={(e) => setFormData({ ...formData, view: e.target.value })}
            placeholder="e.g., Sea View, Garden View"
            data-testid="input-unit-view"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishing">Finishing</Label>
          <Select value={formData.finishing || ""} onValueChange={(value) => setFormData({ ...formData, finishing: value })}>
            <SelectTrigger data-testid="select-unit-finishing">
              <SelectValue placeholder="Select finishing" />
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
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ""}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          data-testid="input-unit-notes"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-unit">
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingUnit ? "Update" : "Create"} Unit
        </Button>
      </DialogFooter>
    </form>
  );

  const StackingPlanView = () => (
    <div className="space-y-2">
      <div className="flex gap-4 mb-4">
        {UNIT_STATUSES.map((status) => (
          <div key={status.value} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${status.color}`} />
            <span className="text-sm">{status.label}</span>
          </div>
        ))}
      </div>
      {floors.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No units with floor information</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {floors.map((floor) => {
            const floorUnits = filteredUnits.filter((u) => u.floor === floor).sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
            return (
              <div key={floor} className="flex border-b last:border-b-0">
                <div className="w-20 flex-shrink-0 bg-muted flex items-center justify-center font-medium p-2">
                  Floor {floor}
                </div>
                <div className="flex-1 flex flex-wrap gap-2 p-2">
                  {floorUnits.map((unit) => (
                    <Dialog key={unit.id} open={editingUnit?.id === unit.id} onOpenChange={(open) => { if (!open) resetForm(); }}>
                      <DialogTrigger asChild>
                        <button
                          className={`w-16 h-16 rounded-md flex flex-col items-center justify-center text-white text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${getStatusColor(unit.status)}`}
                          onClick={() => openEditDialog(unit)}
                          data-testid={`unit-cell-${unit.id}`}
                        >
                          <span>{unit.unitNumber}</span>
                          {unit.type && <span className="text-[10px] opacity-80">{unit.type}</span>}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Unit {unit.unitNumber}</DialogTitle>
                        </DialogHeader>
                        <UnitForm />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const TableView = () => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Unit</TableHead>
            <TableHead>Floor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Beds/Baths</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUnits.map((unit) => (
            <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
              <TableCell className="font-medium">{unit.unitNumber}</TableCell>
              <TableCell>{unit.floor || "-"}</TableCell>
              <TableCell>{unit.type || "-"}</TableCell>
              <TableCell>{unit.bedrooms || 0} / {unit.bathrooms || 0}</TableCell>
              <TableCell>{unit.area ? `${unit.area} sqm` : "-"}</TableCell>
              <TableCell>{unit.price ? unit.price.toLocaleString() : "-"}</TableCell>
              <TableCell>
                <Badge className={`${getStatusColor(unit.status)} text-white`}>
                  {getStatusLabel(unit.status)}
                </Badge>
              </TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog open={editingUnit?.id === unit.id} onOpenChange={(open) => { if (!open) resetForm(); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(unit)} data-testid={`button-edit-unit-${unit.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Unit {unit.unitNumber}</DialogTitle>
                        </DialogHeader>
                        <UnitForm />
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
                            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete unit "{unit.unitNumber}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(unit.id)} data-testid="button-confirm-delete-unit">
                              Delete
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
    </Card>
  );

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/inventory/projects">
          <Button variant="ghost" size="icon" data-testid="button-back-to-projects">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {project?.name || "Project"} - Units
          </h1>
          <p className="text-muted-foreground">{filteredUnits.length} units found</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "stacking" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("stacking")}
            data-testid="button-view-stacking"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-table"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-unit">
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
              </DialogHeader>
              <UnitForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48" data-testid="filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {UNIT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No units found</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setIsAddOpen(true)} data-testid="button-add-first-unit">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Unit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        viewMode === "stacking" ? <StackingPlanView /> : <TableView />
      )}
    </div>
  );
}
