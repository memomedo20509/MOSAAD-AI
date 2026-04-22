import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Package, Pencil, Trash2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import type { Product } from "@shared/schema";
import { format } from "date-fns";

function ProductForm({ initial, onSave, onCancel, isPending, t }: {
  initial?: Partial<Product>;
  onSave: (data: Partial<Product>) => void;
  onCancel: () => void;
  isPending: boolean;
  t: Record<string, string>;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    price: initial?.price?.toString() ?? "0",
    stock: initial?.stock?.toString() ?? "0",
    imageUrl: initial?.imageUrl ?? "",
    isActive: initial?.isActive ?? true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="product-name">{t.productName} *</Label>
        <Input
          id="product-name"
          data-testid="input-product-name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={t.productName}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="product-category">{t.productCategory}</Label>
          <Input
            id="product-category"
            data-testid="input-product-category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder={t.productCategory}
          />
        </div>
        <div>
          <Label htmlFor="product-price">{t.productPrice} *</Label>
          <Input
            id="product-price"
            data-testid="input-product-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="product-stock">{t.productStock}</Label>
          <Input
            id="product-stock"
            data-testid="input-product-stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="product-image-url">{t.productImageUrl}</Label>
          <Input
            id="product-image-url"
            data-testid="input-product-image-url"
            value={form.imageUrl}
            onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>
      <div>
        <Label htmlFor="product-description">{t.productDescription}</Label>
        <Textarea
          id="product-description"
          data-testid="input-product-description"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder={t.productDescription}
          rows={3}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="product-active"
          data-testid="switch-product-active"
          checked={form.isActive}
          onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
        />
        <Label htmlFor="product-active">{t.productActive}</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-product">{t.cancel}</Button>
        <Button
          onClick={() => onSave({
            ...form,
            price: parseFloat(form.price) || 0,
            stock: parseInt(form.stock) || 0,
            imageUrl: form.imageUrl || null,
            description: form.description || null,
            category: form.category || null,
          })}
          disabled={!form.name || isPending}
          data-testid="button-save-product"
        >
          {isPending ? t.saving : t.save}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ProductsPage() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const { data: productList = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Product>) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
      toast({ title: t.productCreatedSuccess });
    },
    onError: () => toast({ title: t.productCreatedError, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditProduct(null);
      toast({ title: t.productUpdatedSuccess });
    },
    onError: () => toast({ title: t.productUpdatedError, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t.productDeletedSuccess });
    },
    onError: () => toast({ title: t.productDeletedError, variant: "destructive" }),
  });

  const toggleActive = (product: Product) => {
    updateMutation.mutate({ id: product.id, data: { isActive: !product.isActive } });
  };

  const filtered = productList.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name ?? "").toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"} data-testid="page-products">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.productsTitle}</h1>
          <p className="text-muted-foreground">{t.productsSubtitle}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-product">
          <Plus className="h-4 w-4 me-2" />
          {t.addProduct}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchProducts}
            className="ps-9"
            data-testid="input-search-products"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} {t.productCount}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : productList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{t.noProductsYet}</p>
              <p className="text-sm text-muted-foreground">{t.productsSubtitle}</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-product">
              <Plus className="h-4 w-4 me-2" />
              {t.addFirstProduct}
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">{t.noProductsFound}</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>{t.clearSearch}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-start py-3 px-4 font-medium">{t.productName}</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">{t.productCategory}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.productPrice}</th>
                    <th className="text-start py-3 px-4 font-medium hidden md:table-cell">{t.productStock}</th>
                    <th className="text-start py-3 px-4 font-medium">{t.status}</th>
                    <th className="text-start py-3 px-4 font-medium hidden lg:table-cell">{t.date}</th>
                    <th className="text-end py-3 px-4 font-medium">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(product => (
                    <tr
                      key={product.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                      data-testid={`row-product-${product.id}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover"
                              data-testid={`img-product-${product.id}`}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                        {product.category ?? "—"}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {Number(product.price).toLocaleString()} {t.currencySymbol}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell" data-testid={`text-stock-${product.id}`}>
                        {product.stock}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={product.isActive ?? true}
                            onCheckedChange={() => toggleActive(product)}
                            data-testid={`switch-active-${product.id}`}
                          />
                          <Badge className={product.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }>
                            {product.isActive ? t.productActive : t.productInactive}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {product.createdAt ? format(new Date(product.createdAt), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditProduct(product)}
                            data-testid={`button-edit-product-${product.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(t.deleteProduct + "?")) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                            data-testid={`button-delete-product-${product.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.addProduct}</DialogTitle>
          </DialogHeader>
          <ProductForm
            t={t}
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setDialogOpen(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProduct} onOpenChange={open => !open && setEditProduct(null)}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.editProduct}</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              t={t}
              initial={editProduct}
              onSave={data => updateMutation.mutate({ id: editProduct.id, data })}
              onCancel={() => setEditProduct(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
