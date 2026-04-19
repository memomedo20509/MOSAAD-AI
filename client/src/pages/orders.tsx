import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShoppingBag, Search, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderStatus } from "@shared/schema";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  in_delivery: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const { data: orderList = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) =>
      apiRequest("PATCH", `/api/orders/${id}`, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, ...data } : null);
      }
      toast({ title: "تم تحديث الطلب" });
    },
    onError: () => toast({ title: "فشل تحديث الطلب", variant: "destructive" }),
  });

  const updateStatus = (status: OrderStatus) => {
    if (!selectedOrder) return;
    updateMutation.mutate({ id: selectedOrder.id, data: { status } });
    setSelectedOrder(prev => prev ? { ...prev, status } : null);
  };

  const saveNote = () => {
    if (!selectedOrder) return;
    updateMutation.mutate({ id: selectedOrder.id, data: { notes: internalNote } });
  };

  const filtered = orderList.filter(o => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.customerPhone ?? "").includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasFilters = filterStatus !== "all" || search;

  return (
    <div className="space-y-6" dir="rtl" data-testid="page-orders">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">الطلبات</h1>
          <p className="text-muted-foreground">إدارة طلبات العملاء الواردة</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم العميل أو الهاتف..."
            className="pr-9"
            data-testid="input-search-orders"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44" data-testid="select-filter-status">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {ORDER_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterStatus("all"); setSearch(""); }}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 ml-1" />
            مسح
          </Button>
        )}
        <span className="text-sm text-muted-foreground mr-auto">{filtered.length} طلب</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : orderList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">لا توجد طلبات بعد</p>
              <p className="text-sm text-muted-foreground">الطلبات التي يجمعها الشات بوت ستظهر هنا</p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="font-medium text-muted-foreground">لا توجد نتائج مطابقة</p>
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setSearch(""); }}>
              مسح الفلاتر
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-right py-3 px-4 font-medium">رقم الطلب</th>
                    <th className="text-right py-3 px-4 font-medium">العميل</th>
                    <th className="text-right py-3 px-4 font-medium hidden md:table-cell">الهاتف</th>
                    <th className="text-right py-3 px-4 font-medium hidden md:table-cell">المنتجات</th>
                    <th className="text-right py-3 px-4 font-medium">الإجمالي</th>
                    <th className="text-right py-3 px-4 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr
                      key={order.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedOrder(order);
                        setInternalNote(order.notes ?? "");
                      }}
                      data-testid={`row-order-${order.id}`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-medium">{order.customerName ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                        {order.customerPhone ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                        {Array.isArray(order.items) ? order.items.length : 0} منتج
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {Number(order.totalAmount).toLocaleString("ar-EG")} ر.س
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn(STATUS_COLORS[order.status as OrderStatus] ?? "")}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">
                        {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <SheetContent className="w-96 sm:w-[480px] overflow-y-auto" side="left">
          <SheetHeader>
            <SheetTitle>تفاصيل الطلب</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="mt-4 space-y-5 text-sm" dir="rtl">
              <div className="space-y-2">
                <h3 className="font-semibold text-base">معلومات العميل</h3>
                {[
                  { label: "رقم الطلب", value: `#${selectedOrder.id.slice(0, 8).toUpperCase()}` },
                  { label: "الاسم", value: selectedOrder.customerName },
                  { label: "الهاتف", value: selectedOrder.customerPhone },
                  { label: "عنوان التوصيل", value: selectedOrder.deliveryAddress },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2 border-b pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-end">{value ?? "—"}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-b pb-2">
                  <span className="text-muted-foreground">التاريخ</span>
                  <span>{selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), "dd/MM/yyyy HH:mm") : "—"}</span>
                </div>
              </div>

              {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">المنتجات المطلوبة</h3>
                  <div className="rounded-md border divide-y">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {Number(item.unitPrice).toLocaleString("ar-EG")} ر.س
                          </p>
                        </div>
                        <span className="font-medium shrink-0">
                          {(item.quantity * item.unitPrice).toLocaleString("ar-EG")} ر.س
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-semibold pt-1">
                    <span>الإجمالي</span>
                    <span>{Number(selectedOrder.totalAmount).toLocaleString("ar-EG")} ر.س</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-base">تحديث الحالة</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUSES.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedOrder.status === s ? "default" : "outline"}
                      className="justify-center"
                      onClick={() => updateStatus(s)}
                      disabled={updateMutation.isPending}
                      data-testid={`button-status-${s}`}
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="internal-note" className="font-semibold text-base">ملاحظات داخلية</Label>
                <Textarea
                  id="internal-note"
                  data-testid="input-internal-note"
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  placeholder="أضف ملاحظة داخلية..."
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={saveNote}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-note"
                >
                  حفظ الملاحظة
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
