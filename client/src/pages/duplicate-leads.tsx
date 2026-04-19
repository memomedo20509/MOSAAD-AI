import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Copy, Trash2, Phone, Search, Merge } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";

export default function DuplicateLeadsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEcommerce = user?.companyBusinessType === "ecommerce";
  const [search, setSearch] = useState("");
  const [mergeGroup, setMergeGroup] = useState<{ phone: string; leads: Lead[] } | null>(null);
  const [keepLeadId, setKeepLeadId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });

  const duplicateGroups = useMemo(() => {
    const phoneMap = new Map<string, Lead[]>();
    leads.forEach((lead) => {
      const phone = lead.phone?.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
      if (!phone) return;
      if (!phoneMap.has(phone)) phoneMap.set(phone, []);
      phoneMap.get(phone)!.push(lead);
    });
    const groups: { phone: string; leads: Lead[] }[] = [];
    phoneMap.forEach((group, phone) => {
      if (group.length > 1) groups.push({ phone, leads: group });
    });
    return groups;
  }, [leads]);

  const filtered = search
    ? duplicateGroups.filter((g) =>
        g.phone.includes(search) ||
        g.leads.some((l) => (l.name ?? "").toLowerCase().includes(search.toLowerCase()))
      )
    : duplicateGroups;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "تم حذف الليد المكرر" });
    },
    onError: () => toast({ title: "فشل في حذف الليد", variant: "destructive" }),
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, deleteIds }: { keepId: string; deleteIds: string[] }) => {
      for (const id of deleteIds) {
        await apiRequest("DELETE", `/api/leads/${id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setMergeGroup(null);
      setKeepLeadId(null);
      toast({ title: isEcommerce ? "تم دمج الطلبات المكررة" : "تم دمج الليدز المكررة" });
    },
    onError: () => toast({ title: isEcommerce ? "فشل في دمج الطلبات" : "فشل في دمج الليدز", variant: "destructive" }),
  });

  const handleMerge = () => {
    if (!mergeGroup || !keepLeadId) return;
    const deleteIds = mergeGroup.leads.filter((l) => l.id !== keepLeadId).map((l) => l.id);
    mergeMutation.mutate({ keepId: keepLeadId, deleteIds });
  };

  const totalDuplicates = duplicateGroups.reduce((s, g) => s + g.leads.length - 1, 0);

  return (
    <div className="space-y-6" data-testid="page-duplicate-leads">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isEcommerce ? "الطلبات المكررة" : "الليدز المكررة"}</h1>
        <p className="text-muted-foreground">{isEcommerce ? "إدارة الطلبات المكررة بناءً على رقم الهاتف" : "إدارة الليدز المكررة بناءً على رقم الهاتف"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-duplicates"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" data-testid="badge-groups-count">{duplicateGroups.length} مجموعة</Badge>
          <Badge variant="destructive" data-testid="badge-duplicates-count">{totalDuplicates} مكرر</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Copy className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">{isEcommerce ? "لا يوجد طلبات مكررة" : "لا يوجد ليدز مكررة"}</p>
              <p className="text-sm text-muted-foreground">جميع أرقام الهواتف فريدة</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((group) => (
            <Card key={group.phone} data-testid={`group-duplicate-${group.phone}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base">
                    <Phone className="h-4 w-4" />
                    <span dir="ltr">{group.phone}</span>
                    <Badge variant="destructive" className="text-xs">{group.leads.length} نسخ</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMergeGroup(group); setKeepLeadId(group.leads[0].id); }}
                    data-testid={`button-merge-group-${group.phone}`}
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    دمج
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-start py-2 px-3 font-medium">الاسم</th>
                        <th className="text-start py-2 px-3 font-medium">القناة</th>
                        <th className="text-start py-2 px-3 font-medium">تاريخ الإنشاء</th>
                        <th className="text-end py-2 px-3 font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.leads.map((lead, idx) => (
                        <tr key={lead.id} className="border-b last:border-0" data-testid={`row-dup-lead-${lead.id}`}>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {idx === 0 && <Badge className="bg-green-100 text-green-700 text-[10px]">أصلي</Badge>}
                              <span className="font-medium" data-testid={`text-dup-name-${lead.id}`}>{lead.name ?? "بدون اسم"}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground capitalize" data-testid={`text-dup-channel-${lead.id}`}>{lead.channel ?? "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs" data-testid={`text-dup-date-${lead.id}`}>
                            {lead.createdAt ? format(new Date(lead.createdAt), "yyyy-MM-dd") : "—"}
                          </td>
                          <td className="py-2 px-3 text-end">
                            {idx > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteMutation.mutate(lead.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-dup-${lead.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                حذف
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!mergeGroup} onOpenChange={(open) => { if (!open) { setMergeGroup(null); setKeepLeadId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEcommerce ? "دمج الطلبات المكررة" : "دمج الليدز المكررة"}</DialogTitle>
          </DialogHeader>
          {mergeGroup && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">اختر الليد الذي تريد الاحتفاظ به. سيتم حذف الباقي.</p>
              <div className="space-y-2">
                {mergeGroup.leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${keepLeadId === lead.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => setKeepLeadId(lead.id)}
                    data-testid={`merge-option-${lead.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{lead.name ?? "بدون اسم"}</span>
                        <span className="text-xs text-muted-foreground ml-2">{lead.channel ?? ""}</span>
                      </div>
                      {keepLeadId === lead.id && (
                        <Badge className="bg-green-100 text-green-700">الاحتفاظ</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lead.createdAt ? format(new Date(lead.createdAt), "yyyy-MM-dd") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeGroup(null); setKeepLeadId(null); }} data-testid="button-cancel-merge">إلغاء</Button>
            <Button onClick={handleMerge} disabled={!keepLeadId || mergeMutation.isPending} data-testid="button-confirm-merge">
              {mergeMutation.isPending ? "جاري الدمج..." : "تأكيد الدمج"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
