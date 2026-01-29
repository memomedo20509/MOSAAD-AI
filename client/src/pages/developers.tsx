import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Building2, Phone, Mail, Globe, MapPin, Loader2 } from "lucide-react";
import type { Developer, InsertDeveloper } from "@shared/schema";

export default function DevelopersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [formData, setFormData] = useState<Partial<InsertDeveloper>>({});

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: developers = [], isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertDeveloper) => apiRequest("POST", "/api/developers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      setIsAddOpen(false);
      setFormData({});
      toast({ title: "Developer created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create developer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Developer> }) =>
      apiRequest("PATCH", `/api/developers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      setEditingDeveloper(null);
      setFormData({});
      toast({ title: "Developer updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update developer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/developers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      toast({ title: "Developer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete developer", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDeveloper) {
      updateMutation.mutate({ id: editingDeveloper.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertDeveloper);
    }
  };

  const openEditDialog = (developer: Developer) => {
    setEditingDeveloper(developer);
    setFormData({
      name: developer.name,
      phone: developer.phone || "",
      email: developer.email || "",
      website: developer.website || "",
      address: developer.address || "",
      description: developer.description || "",
      isActive: developer.isActive ?? true,
    });
  };

  const resetForm = () => {
    setFormData({});
    setEditingDeveloper(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const DeveloperForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Developer Name *</Label>
        <Input
          id="name"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          data-testid="input-developer-name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone || ""}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            data-testid="input-developer-phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            data-testid="input-developer-email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          value={formData.website || ""}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          data-testid="input-developer-website"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          data-testid="input-developer-address"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid="input-developer-description"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive ?? true}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          data-testid="switch-developer-active"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-developer">
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingDeveloper ? "Update" : "Create"} Developer
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Developers</h1>
          <p className="text-muted-foreground">Manage real estate developers</p>
        </div>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-developer">
                <Plus className="mr-2 h-4 w-4" />
                Add Developer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Developer</DialogTitle>
              </DialogHeader>
              <DeveloperForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {developers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No developers found</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setIsAddOpen(true)} data-testid="button-add-first-developer">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Developer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {developers.map((developer) => (
            <Card key={developer.id} className={!developer.isActive ? "opacity-60" : ""} data-testid={`card-developer-${developer.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate" data-testid={`text-developer-name-${developer.id}`}>
                    {developer.name}
                  </CardTitle>
                  {!developer.isActive && (
                    <span className="text-xs text-muted-foreground">(Inactive)</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Dialog open={editingDeveloper?.id === developer.id} onOpenChange={(open) => { if (!open) resetForm(); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(developer)} data-testid={`button-edit-developer-${developer.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Developer</DialogTitle>
                        </DialogHeader>
                        <DeveloperForm />
                      </DialogContent>
                    </Dialog>
                    {isSuperAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-delete-developer-${developer.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Developer?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete "{developer.name}" and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(developer.id)} data-testid="button-confirm-delete-developer">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {developer.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{developer.phone}</span>
                  </div>
                )}
                {developer.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{developer.email}</span>
                  </div>
                )}
                {developer.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <a href={developer.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                      {developer.website}
                    </a>
                  </div>
                )}
                {developer.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{developer.address}</span>
                  </div>
                )}
                {developer.description && (
                  <p className="text-muted-foreground line-clamp-2 mt-2">{developer.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
