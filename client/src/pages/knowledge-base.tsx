import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { KnowledgeBaseItem } from "@shared/schema";

function ItemForm({ initial, onSave, onCancel, isPending }: {
  initial?: Partial<KnowledgeBaseItem>;
  onSave: (data: Partial<KnowledgeBaseItem>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    price: initial?.price?.toString() ?? "",
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="item-name">Name *</Label>
        <Input id="item-name" data-testid="input-item-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product or service name" />
      </div>
      <div>
        <Label htmlFor="item-description">Description</Label>
        <Textarea id="item-description" data-testid="input-item-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this item..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="item-category">Category</Label>
          <Input id="item-category" data-testid="input-item-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Product, Service" />
        </div>
        <div>
          <Label htmlFor="item-price">Price</Label>
          <Input id="item-price" data-testid="input-item-price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">Cancel</Button>
        <Button onClick={() => onSave({ ...form, price: form.price || null })} disabled={!form.name || isPending} data-testid="button-save-item">
          {isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeBaseItem | null>(null);

  const { data: items = [], isLoading } = useQuery<KnowledgeBaseItem[]>({ queryKey: ["/api/knowledge-base"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<KnowledgeBaseItem>) => apiRequest("POST", "/api/knowledge-base", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setDialogOpen(false);
      toast({ title: "Item created" });
    },
    onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KnowledgeBaseItem> }) => apiRequest("PATCH", `/api/knowledge-base/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setEditItem(null);
      toast({ title: "Item updated" });
    },
    onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: "Item deleted" });
    },
    onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
  });

  return (
    <div className="space-y-6" data-testid="page-knowledge-base">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">Products and services your chatbot knows about</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-item">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No items yet</p>
              <p className="text-sm text-muted-foreground">Add products or services your chatbot can reference</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <Card key={item.id} data-testid={`card-kb-item-${item.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{item.name}</CardTitle>
                  {item.category && <Badge variant="secondary" className="mt-1">{item.category}</Badge>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEditItem(item)} data-testid={`button-edit-item-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-item-${item.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.price != null && <p className="text-sm font-semibold mt-2">${item.price.toLocaleString()}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Knowledge Base Item</DialogTitle></DialogHeader>
          <ItemForm onSave={data => createMutation.mutate(data)} onCancel={() => setDialogOpen(false)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          {editItem && <ItemForm initial={editItem} onSave={data => updateMutation.mutate({ id: editItem.id, data })} onCancel={() => setEditItem(null)} isPending={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
