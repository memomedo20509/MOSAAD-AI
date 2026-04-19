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
import type { Product } from "@shared/schema";
import { format } from "date-fns";

function ProductForm({ initial, onSave, onCancel, isPending }: {
  initial?: Partial<Product>;
  onSave: (data: Partial<Product>) => void;
  onCancel: () => void;
  isPending: boolean;
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
        <Label htmlFor="product-name">اسم المنتج *</Label>
        <Input
          id="product-name"
          data-testid="input-product-name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="اسم المنتج"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="product-category">الفئة</Label>
          <Input
            id="product-category"
            data-testid="input-product-category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="مثال: ملابس، إلكترونيات"
          />
        </div>
        <div>
          <Label htmlFor="product-price">السعر *</Label>
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
          <Label htmlFor="product-stock">المخزون</Label>
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
          <Label htmlFor="product-image-url">رابط الصورة</Label>
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
        <Label htmlFor="product-description">الوصف</Label>
        <Textarea
          id="product-description"
          data-testid="input-product-description"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="وصف المنتج..."
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
        <Label htmlFor="product-active">نشط</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-product">إلغاء</Button>
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
          {isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const { data: productList = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Product>) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
      toast({ title: "تم إضافة المنتج" });
    },
    onError: () => toast({ title: "فشل إضافة المنتج", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditProduct(null);
      toast({ title: "تم تحديث المنتج" });
    },
    onError: () => toast({ title: "فشل تحديث المنتج", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم حذف المنتج" });
    },
    onError: () => toast({ title: "فشل حذف المنتج", variant: "destructive" }),
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
    <div className="space-y-6" dir="rtl" data-testid="page-products">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">المنتجات</h1>
          <p className="text-muted-foreground">إدارة منتجات متجرك الإلكتروني</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-product">
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في المنتجات..."
            className="pr-9"
            data-testid="input-search-products"
          />
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} منتج</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : productList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">لا توجد منتجات بعد</p>
              <p className="text-sm text-muted-foreground">أضف منتجاتك لتظهر في قائمة الشات بوت</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-product">
              <Plus className="h-4 w-4 ml-2" />
              أضف أول منتج
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">لا توجد نتائج</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>مسح البحث</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-medium">المنتج</th>
                    <th className="text-right py-3 px-4 font-medium hidden md:table-cell">الفئة</th>
                    <th className="text-right py-3 px-4 font-medium">السعر</th>
                    <th className="text-right py-3 px-4 font-medium hidden md:table-cell">المخزون</th>
                    <th className="text-right py-3 px-4 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">تاريخ الإضافة</th>
                    <th className="text-left py-3 px-4 font-medium">إجراءات</th>
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
                        {Number(product.price).toLocaleString("ar-EG")} ر.س
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
                            {product.isActive ? "نشط" : "غير نشط"}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {product.createdAt ? format(new Date(product.createdAt), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
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
                              if (confirm("هل تريد حذف هذا المنتج؟")) {
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
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة منتج جديد</DialogTitle>
          </DialogHeader>
          <ProductForm
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setDialogOpen(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProduct} onOpenChange={open => !open && setEditProduct(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المنتج</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <ProductForm
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
