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
import { Plus, Pencil, Trash2, BookOpen, Package, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import type { KnowledgeBaseItem, Product } from "@shared/schema";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "product", "service", "faq", "pricing"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, string> = {
  product: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  service: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  faq: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pricing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function ItemForm({ initial, onSave, onCancel, isPending, t }: {
  initial?: Partial<KnowledgeBaseItem>;
  onSave: (data: Partial<KnowledgeBaseItem>) => void;
  onCancel: () => void;
  isPending: boolean;
  t: Record<string, string>;
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
        <Label htmlFor="item-name">{t.kbItemTitle} *</Label>
        <Input id="item-name" data-testid="input-item-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.kbItemTitle} />
      </div>
      <div>
        <Label htmlFor="item-category">{t.kbItemCategory}</Label>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger id="item-category" data-testid="select-item-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">{t.kbCatProduct}</SelectItem>
            <SelectItem value="service">{t.kbCatService}</SelectItem>
            <SelectItem value="faq">{t.kbCatFaq}</SelectItem>
            <SelectItem value="pricing">{t.kbCatPricing}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="item-description">{t.kbItemDescription}</Label>
        <Textarea id="item-description" data-testid="input-item-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t.kbItemDescription} rows={3} />
      </div>
      <div>
        <Label htmlFor="item-price">{t.kbItemPrice}</Label>
        <Input id="item-price" data-testid="input-item-price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">{t.cancel}</Button>
        <Button onClick={() => onSave({ ...form, price: form.price || null })} disabled={!form.name || isPending} data-testid="button-save-item">
          {isPending ? t.saving : t.save}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeBaseItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const CATEGORY_LABELS: Record<Category, string> = {
    all: t.kbCatAll,
    product: t.kbCatProduct,
    service: t.kbCatService,
    faq: t.kbCatFaq,
    pricing: t.kbCatPricing,
  };

  const { data: items = [], isLoading } = useQuery<KnowledgeBaseItem[]>({ queryKey: ["/api/knowledge-base"] });
  const { data: productList = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isEcommerce,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<KnowledgeBaseItem>) => apiRequest("POST", "/api/knowledge-base", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setDialogOpen(false);
      toast({ title: t.kbItemCreated });
    },
    onError: () => toast({ title: t.kbItemCreatedError, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KnowledgeBaseItem> }) => apiRequest("PATCH", `/api/knowledge-base/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      setEditItem(null);
      toast({ title: t.kbItemUpdated });
    },
    onError: () => toast({ title: t.kbItemUpdatedError, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: t.kbItemDeleted });
    },
    onError: () => toast({ title: t.kbItemDeletedError, variant: "destructive" }),
  });

  const filtered = activeCategory === "all" ? items : items.filter(item => item.category === activeCategory);

  if (isEcommerce) {
    const activeProducts = productList.filter(p => p.isActive);
    return (
      <div className="space-y-6" data-testid="page-knowledge-base" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.kbTitle}</h1>
            <p className="text-muted-foreground">{t.kbSubtitleEcommerce}</p>
          </div>
          <Link href="/products" data-testid="link-manage-products">
            <Button variant="outline">
              <LinkIcon className="h-4 w-4 me-2" />
              {t.kbManageProducts}
            </Button>
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : activeProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Package className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">{t.kbNoActiveProducts}</p>
                <p className="text-sm text-muted-foreground">{t.kbNoActiveProductsDesc}</p>
                <Link href="/products">
                  <Button className="mt-4" data-testid="button-add-first-product">
                    <Plus className="h-4 w-4 me-2" />
                    {t.addProduct}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map(product => (
              <Card key={product.id} data-testid={`card-product-kb-${product.id}`}>
                <CardHeader className="flex flex-row items-start gap-3 pb-2">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-12 w-12 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{product.name}</CardTitle>
                    {product.category && (
                      <Badge className="mt-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{Number(product.price).toLocaleString()} {t.currencySymbol}</span>
                    <span className="text-xs text-muted-foreground">{t.kbStock}: {product.stock}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-knowledge-base" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.kbTitle}</h1>
          <p className="text-muted-foreground">{t.kbSubtitle}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-item">
          <Plus className="h-4 w-4 me-2" />
          {t.kbAddItem}
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
                <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{count}</span>
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
              <p className="font-medium">{t.kbNoItemsYet}</p>
              <p className="text-sm text-muted-foreground">{t.kbNoItemsDesc}</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)} data-testid="button-add-first-item">
                <Plus className="h-4 w-4 me-2" />
                {t.kbAddFirstItem}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">{t.kbNoItemsInCategory}</p>
            <Button variant="ghost" size="sm" onClick={() => setActiveCategory("all")}>{t.kbViewAll}</Button>
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
                      {CATEGORY_LABELS[item.category as Category] ?? item.category}
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
                {item.price != null && <p className="text-sm font-semibold mt-2">{Number(item.price).toLocaleString()} {t.currencySymbol}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t.kbAddItemTitle}</DialogTitle></DialogHeader>
          <ItemForm t={t} onSave={data => createMutation.mutate(data)} onCancel={() => setDialogOpen(false)} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={open => !open && setEditItem(null)}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t.kbEditItemTitle}</DialogTitle></DialogHeader>
          {editItem && <ItemForm t={t} initial={editItem} onSave={data => updateMutation.mutate({ id: editItem.id, data })} onCancel={() => setEditItem(null)} isPending={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
