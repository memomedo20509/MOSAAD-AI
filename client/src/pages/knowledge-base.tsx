import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { KnowledgeBaseItem } from "@shared/schema";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "product", "service", "faq", "pricing"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  product: "Products",
  service: "Services",
  faq: "FAQs",
  pricing: "Pricing",
};

const CATEGORY_COLORS: Record<string, string> = {
  product: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  service: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  faq: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pricing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function ItemForm({ initial, onSave, onCancel, isPending }: {
  initial?: Partial<KnowledgeBaseItem>;
  onSave: (data: Partial<KnowledgeBaseItem>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "product",
    price: initial?.price?.toString() ?? "",
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="item-name">Title *</Label>
        <Input id="item-name" data-testid="input-item-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product or service name" />
      </div>
      <div>
        <Label htmlFor="item-category">Category</Label>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger id="item-category" data-testid="select-item-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="faq">FAQ</SelectItem>
            <SelectItem value="pricing">Pricing</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="item-description">Description</Label>
        <Textarea id="item-description" data-testid="input-item-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this item..." rows={3} />
      </div>
      <div>
        <Label htmlFor="item-price">Price (optional)</Label>
        <Input id="item-price" data-testid="input-item-price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
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
  const [activeCategory, setActiveCategory] = useState<Category>("all");

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

  const filtered = activeCategory === "all" ? items : items.filter(item => item.category === activeCategory);

  return (
    <div className="space-y-6" data-testid="page-knowledge-base">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">Products, services, and FAQs your chatbot knows about</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-item">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {CATEGORIES.map(cat => {
          const count = cat === "all" ? items.length : items.filter(i => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              data-testid={`tab-category-${cat}`}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
                activeCategory === cat
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[cat]}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
              )}
            </button>
          );
        })}
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
              <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-add-first-item">
                <Plus className="h-4 w-4 mr-2" />
                Add your first item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">No {activeCategory} items yet</p>
            <Button variant="ghost" size="sm" onClick={() => setActiveCategory("all")}>View all items</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => (
            <Card key={item.id} data-testid={`card-kb-item-${item.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{item.name}</CardTitle>
                  {item.category && (
                    <Badge className={cn("mt-1", CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-600")}>
                      {item.category}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => setEditItem(item)} data-testid={`button-edit-item-${item.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-item-${item.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.price != null && <p className="text-sm font-semibold mt-2">${Number(item.price).toLocaleString()}</p>}
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
