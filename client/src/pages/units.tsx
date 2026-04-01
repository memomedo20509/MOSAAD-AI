import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, ArrowLeft, Loader2, LayoutGrid, List, Calculator,
  GitCompare, X, Building2, CreditCard, ExternalLink, DollarSign, ChevronDown, ChevronUp,
  BedDouble, Bath, Ruler, Tag, Home,
} from "lucide-react";
import type { Unit, Project, Developer, InsertUnit } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { InstallmentCalculator } from "@/components/installment-calculator";
import { UnitCompare } from "@/components/unit-compare";

const UNIT_TYPES_AR = ["شقة","فيلا","توين هاوس","تاون هاوس","دوبلكس","بنتهاوس","إستوديو","لوفت","مكتب","شاليه","تجاري"];
const UNIT_TYPES_EN = ["Apartment","Studio","Duplex","Penthouse","Villa","Townhouse","Office","Shop","Warehouse"];
const UNIT_STATUSES = [
  { value: "available", label: "متاحة", labelEn: "Available", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200" },
  { value: "reserved", label: "محجوزة", labelEn: "Reserved", color: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200" },
  { value: "sold", label: "مباعة", labelEn: "Sold", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200" },
];
const FINISHING_OPTIONS_AR = ["كور وشيل","نصف تشطيب","تشطيب كامل","مفروشة"];
const FINISHING_OPTIONS = ["Core & Shell", "Semi-Finished", "Fully Finished", "Furnished"];

function getStatusInfo(status: string | null) {
  return UNIT_STATUSES.find(s => s.value === status) || UNIT_STATUSES[0];
}

function formatPrice(p: number | null | undefined): string {
  if (!p) return "-";
  if (p >= 1000000) return `${(p / 1000000).toFixed(1)} م جم`;
  return `${p.toLocaleString()} جم`;
}

function calcPricePerM2(price: number | null | undefined, area: number | null | undefined): string {
  if (!price || !area || area === 0) return "-";
  return `${Math.round(price / area).toLocaleString()} جم/م²`;
}

function extractPaymentPlans(desc: string | null): string[] {
  if (!desc) return [];
  const m = desc.match(/📋 أنظمة السداد:\n(.+?)(?:\n\n|$)/s);
  if (!m) return [];
  return m[1].trim().split(' | ');
}

function extractAboutText(desc: string | null): string {
  if (!desc) return "";
  const parts = desc.split('\n📋');
  const about = parts[0].trim();
  const firstLine = about.split('\n')[0];
  if (firstLine.startsWith('عن ')) return about;
  return about;
}

function extractNawyUrl(desc: string | null): string {
  if (!desc) return "";
  const m = desc.match(/🔗 المصدر: (https?:\/\/[^\n]+)/);
  return m ? m[1].trim() : "";
}

export default function UnitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [, params] = useRoute("/inventory/projects/:projectId/units");
  const projectId = params?.projectId;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<Partial<InsertUnit>>({});
  const [viewMode, setViewMode] = useState<"cards" | "stacking" | "table">("cards");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [calcUnit, setCalcUnit] = useState<Unit | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", projectId], enabled: !!projectId });
  const { data: developers = [] } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });
  const developer = useMemo(() => developers.find(d => d.id === project?.developerId), [developers, project]);

  const paymentPlans = useMemo(() => extractPaymentPlans(project?.description || null), [project]);
  const aboutText = useMemo(() => extractAboutText(project?.description || null), [project]);
  const nawyUrl = useMemo(() => extractNawyUrl(project?.description || null), [project]);
  const projectImage = useMemo(() => project?.images?.[0] || null, [project]);

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["/api/projects", projectId, "units"],
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertUnit) => apiRequest("POST", "/api/units", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "units"] }); setIsAddOpen(false); setFormData({}); toast({ title: t.unitCreatedSuccess }); },
    onError: () => toast({ title: t.unitCreatedError, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) => apiRequest("PATCH", `/api/units/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "units"] }); setEditingUnit(null); setFormData({}); toast({ title: t.unitUpdatedSuccess }); },
    onError: () => toast({ title: t.unitUpdatedError, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "units"] }); toast({ title: t.unitDeletedSuccess }); },
    onError: () => toast({ title: t.unitDeletedError, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) updateMutation.mutate({ id: editingUnit.id, data: formData });
    else createMutation.mutate({ ...formData, projectId } as InsertUnit);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({ unitNumber: unit.unitNumber, floor: unit.floor || undefined, building: unit.building || "", type: unit.type || "", bedrooms: unit.bedrooms || undefined, bathrooms: unit.bathrooms || undefined, area: unit.area || undefined, price: unit.price || undefined, status: unit.status || "available", view: unit.view || "", finishing: unit.finishing || "", notes: unit.notes || "" });
  };
  const resetForm = () => { setFormData({}); setEditingUnit(null); };

  const toggleSelectUnit = (id: string) => {
    setSelectedUnitIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const filteredUnits = useMemo(() => units.filter(u => {
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    if (filterType !== "all" && u.type !== filterType) return false;
    return true;
  }), [units, filterStatus, filterType]);

  const selectedUnits = filteredUnits.filter(u => selectedUnitIds.has(u.id));
  const unitTypes = useMemo(() => [...new Set(units.map(u => u.type).filter(Boolean))], [units]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredUnits.length,
    available: filteredUnits.filter(u => u.status === "available").length,
    reserved: filteredUnits.filter(u => u.status === "reserved").length,
    sold: filteredUnits.filter(u => u.status === "sold").length,
  }), [filteredUnits]);

  // Floors for stacking view — must be computed before any early returns
  const floors = useMemo(() => {
    const floorNums = [...new Set(filteredUnits.map(u => u.floor).filter(f => f !== null && f !== undefined))].sort((a, b) => (b || 0) - (a || 0));
    return floorNums;
  }, [filteredUnits]);
  const nullFloorUnits = useMemo(() => filteredUnits.filter(u => u.floor === null || u.floor === undefined), [filteredUnits]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const UnitForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.unitNumber} *</Label>
          <Input value={formData.unitNumber || ""} onChange={e => setFormData({ ...formData, unitNumber: e.target.value })} required data-testid="input-unit-number" />
        </div>
        <div className="space-y-2">
          <Label>{t.floor}</Label>
          <Input type="number" value={formData.floor || ""} onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) || undefined })} data-testid="input-unit-floor" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>المبنى</Label>
          <Input value={formData.building || ""} onChange={e => setFormData({ ...formData, building: e.target.value })} data-testid="input-unit-building" />
        </div>
        <div className="space-y-2">
          <Label>{t.type}</Label>
          <Select value={formData.type || ""} onValueChange={v => setFormData({ ...formData, type: v })}>
            <SelectTrigger data-testid="select-unit-type"><SelectValue placeholder={t.type} /></SelectTrigger>
            <SelectContent>
              {[...UNIT_TYPES_AR, ...UNIT_TYPES_EN].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>غرف النوم</Label>
          <Input type="number" value={formData.bedrooms || ""} onChange={e => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || undefined })} data-testid="input-unit-bedrooms" />
        </div>
        <div className="space-y-2">
          <Label>الحمامات</Label>
          <Input type="number" value={formData.bathrooms || ""} onChange={e => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || undefined })} data-testid="input-unit-bathrooms" />
        </div>
        <div className="space-y-2">
          <Label>المساحة (م²)</Label>
          <Input type="number" value={formData.area || ""} onChange={e => setFormData({ ...formData, area: parseInt(e.target.value) || undefined })} data-testid="input-unit-area" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>السعر (جم)</Label>
          <Input type="number" value={formData.price || ""} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || undefined })} data-testid="input-unit-price" />
        </div>
        <div className="space-y-2">
          <Label>التشطيب</Label>
          <Select value={formData.finishing || ""} onValueChange={v => setFormData({ ...formData, finishing: v })}>
            <SelectTrigger data-testid="select-unit-finishing"><SelectValue placeholder="التشطيب" /></SelectTrigger>
            <SelectContent>
              {FINISHING_OPTIONS.map((o, i) => <SelectItem key={o} value={o}>{FINISHING_OPTIONS_AR[i] || o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>الإطلالة</Label>
          <Input value={formData.view || ""} onChange={e => setFormData({ ...formData, view: e.target.value })} data-testid="input-unit-view" />
        </div>
        <div className="space-y-2">
          <Label>الحالة</Label>
          <Select value={formData.status || "available"} onValueChange={v => setFormData({ ...formData, status: v })}>
            <SelectTrigger data-testid="select-unit-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t.notes}</Label>
        <Textarea value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} data-testid="input-unit-notes" />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-unit">
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingUnit ? t.update : t.create}
        </Button>
      </DialogFooter>
    </form>
  );

  const UnitEditDialog = ({ unit }: { unit: Unit }) => (
    <Dialog open={editingUnit?.id === unit.id} onOpenChange={o => { if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(unit)} data-testid={`button-edit-unit-${unit.id}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>تعديل الوحدة {unit.unitNumber}</DialogTitle></DialogHeader>
        {editingUnit?.id === unit.id && <UnitForm />}
      </DialogContent>
    </Dialog>
  );

  const UnitDeleteDialog = ({ unit }: { unit: Unit }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-delete-unit-${unit.id}`}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>حذف الوحدة؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف الوحدة "{unit.unitNumber}" نهائياً</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteMutation.mutate(unit.id)}>{t.delete}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // CARD VIEW - nawy style
  const CardsView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredUnits.length === 0 ? (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          <Home className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد وحدات</p>
        </div>
      ) : filteredUnits.map(unit => {
        const si = getStatusInfo(unit.status);
        const pricePerM2 = unit.price && unit.area ? Math.round(unit.price / unit.area).toLocaleString() : null;
        return (
          <Card key={unit.id} className="overflow-hidden border hover:shadow-md transition-shadow" data-testid={`card-unit-${unit.id}`}>
            {/* Color header — neutral for sales, status-colored for admin */}
            <div className={`h-2 w-full ${isAdmin ? si.color : "bg-primary/40"}`} />
            <CardContent className="p-4 space-y-3">
              {/* Type + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isAdmin && <Badge variant="outline" className={`text-xs font-semibold ${si.text}`}>{language === "en" ? si.labelEn : si.label}</Badge>}
                  {unit.type && <span className="text-sm font-semibold">{(language === "en" && (unit as any).typeEn) ? (unit as any).typeEn : unit.type}</span>}
                </div>
                <span className="text-xs text-muted-foreground">#{unit.unitNumber}</span>
              </div>

              {/* Bedrooms + Bathrooms + Area */}
              <div className="flex items-center gap-3 text-sm">
                {unit.bedrooms !== null && unit.bedrooms !== undefined && (
                  <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-muted-foreground" />{unit.bedrooms}</span>
                )}
                {unit.bathrooms !== null && unit.bathrooms !== undefined && (
                  <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-muted-foreground" />{unit.bathrooms}</span>
                )}
                {unit.area && (
                  <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-muted-foreground" />{unit.area} م²</span>
                )}
              </div>

              {/* Price */}
              {unit.price && (
                <div className={`rounded-lg px-3 py-2 ${isAdmin ? si.bg : "bg-muted/40"}`}>
                  <p className={`font-bold text-base ${isAdmin ? si.text : "text-foreground"}`}>{unit.price.toLocaleString()} جم</p>
                  {pricePerM2 && <p className="text-xs text-muted-foreground">{pricePerM2} جم/م²</p>}
                </div>
              )}

              {/* Details row */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {unit.floor !== null && unit.floor !== undefined && <span>الطابق {unit.floor}</span>}
                {unit.finishing && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{unit.finishing}</span>}
                {unit.view && <span>إطلالة: {unit.view}</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 pt-1 border-t">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="حساب القسط" onClick={() => setCalcUnit(unit)} data-testid={`button-calc-${unit.id}`}>
                    <Calculator className="h-3.5 w-3.5" />
                  </Button>
                  <Checkbox
                    checked={selectedUnitIds.has(unit.id)}
                    onCheckedChange={() => toggleSelectUnit(unit.id)}
                    disabled={!selectedUnitIds.has(unit.id) && selectedUnitIds.size >= 4}
                    title="إضافة للمقارنة"
                    data-testid={`checkbox-unit-${unit.id}`}
                  />
                  {isAdmin && <UnitEditDialog unit={unit} />}
                  {isSuperAdmin && <UnitDeleteDialog unit={unit} />}
                </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // STACKING VIEW - floor plan grid (fixed: shows null-floor units too)
  const StackingPlanView = () => (
    <div className="space-y-2">
      {isAdmin && (
        <div className="flex gap-4 mb-4">
          {UNIT_STATUSES.map(s => (
            <div key={s.value} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${s.color}`} />
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      {floors.length === 0 && nullFloorUnits.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">لا توجد وحدات</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {floors.map(floor => {
            const floorUnits = filteredUnits.filter(u => u.floor === floor).sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
            return (
              <div key={floor} className="flex border-b last:border-b-0">
                <div className="w-20 flex-shrink-0 bg-muted flex items-center justify-center font-medium p-2 text-sm">
                  ط {floor}
                </div>
                <div className="flex-1 flex flex-wrap gap-2 p-3">
                  {floorUnits.map(unit => {
                    const si = getStatusInfo(unit.status);
                    const cellColor = isAdmin ? si.color : "bg-primary";
                    return (
                      <Dialog key={unit.id} open={editingUnit?.id === unit.id} onOpenChange={o => { if (!o) resetForm(); }}>
                        <DialogTrigger asChild>
                          <button
                            className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md ${cellColor}`}
                            onClick={() => isAdmin && openEditDialog(unit)}
                            data-testid={`unit-cell-${unit.id}`}
                          >
                            <span className="font-bold">{unit.unitNumber}</span>
                            {unit.type && <span className="text-[10px] opacity-90">{unit.type}</span>}
                            {unit.area && <span className="text-[10px] opacity-80">{unit.area} م²</span>}
                          </button>
                        </DialogTrigger>
                        {isAdmin && (
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>تعديل الوحدة {unit.unitNumber}</DialogTitle></DialogHeader>
                            {editingUnit?.id === unit.id && <UnitForm />}
                          </DialogContent>
                        )}
                      </Dialog>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {nullFloorUnits.length > 0 && (
            <div className="flex border-t">
              <div className="w-20 flex-shrink-0 bg-muted flex items-center justify-center font-medium p-2 text-xs text-center text-muted-foreground">
                غير محدد
              </div>
              <div className="flex-1 flex flex-wrap gap-2 p-3">
                {nullFloorUnits.map(unit => {
                  const si = getStatusInfo(unit.status);
                  const cellColor = isAdmin ? si.color : "bg-primary";
                  return (
                    <Dialog key={unit.id} open={editingUnit?.id === unit.id} onOpenChange={o => { if (!o) resetForm(); }}>
                      <DialogTrigger asChild>
                        <button
                          className={`w-20 h-20 rounded-lg flex flex-col items-center justify-center text-white text-xs font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md ${cellColor}`}
                          onClick={() => isAdmin && openEditDialog(unit)}
                          data-testid={`unit-cell-${unit.id}`}
                        >
                          <span className="font-bold">{unit.unitNumber}</span>
                          {unit.type && <span className="text-[10px] opacity-90">{unit.type}</span>}
                          {unit.area && <span className="text-[10px] opacity-80">{unit.area} م²</span>}
                        </button>
                      </DialogTrigger>
                      {isAdmin && (
                        <DialogContent className="max-w-lg">
                          <DialogHeader><DialogTitle>تعديل الوحدة {unit.unitNumber}</DialogTitle></DialogHeader>
                          {editingUnit?.id === unit.id && <UnitForm />}
                        </DialogContent>
                      )}
                    </Dialog>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // TABLE VIEW - fixed columns
  const TableView = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10 text-center">
              <GitCompare className="h-4 w-4 mx-auto" />
            </TableHead>
            <TableHead>رقم الوحدة</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الطابق</TableHead>
            <TableHead>غرف النوم</TableHead>
            <TableHead>الحمامات</TableHead>
            <TableHead>المساحة</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>سعر م²</TableHead>
            <TableHead>التشطيب</TableHead>
            {isAdmin && <TableHead>الحالة</TableHead>}
            <TableHead className="text-left">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUnits.length === 0 ? (
            <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">لا توجد وحدات</TableCell></TableRow>
          ) : filteredUnits.map(unit => {
            const si = getStatusInfo(unit.status);
            const pricePerM2 = unit.price && unit.area ? Math.round(unit.price / unit.area).toLocaleString() : "-";
            return (
              <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`} className="hover:bg-muted/30">
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedUnitIds.has(unit.id)}
                    onCheckedChange={() => toggleSelectUnit(unit.id)}
                    disabled={!selectedUnitIds.has(unit.id) && selectedUnitIds.size >= 4}
                    data-testid={`checkbox-unit-${unit.id}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                <TableCell>{unit.type || "-"}</TableCell>
                <TableCell>{unit.floor !== null && unit.floor !== undefined ? unit.floor : "-"}</TableCell>
                <TableCell className="text-center">{unit.bedrooms ?? "-"}</TableCell>
                <TableCell className="text-center">{unit.bathrooms ?? "-"}</TableCell>
                <TableCell>{unit.area ? `${unit.area} م²` : "-"}</TableCell>
                <TableCell className="font-semibold">{unit.price ? `${unit.price.toLocaleString()} جم` : "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{pricePerM2}</TableCell>
                <TableCell className="text-sm">{unit.finishing || "-"}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Badge className={`${si.color} text-white text-xs`}>{si.label}</Badge>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="حساب القسط" onClick={() => setCalcUnit(unit)} data-testid={`button-calc-unit-${unit.id}`}>
                      <Calculator className="h-3.5 w-3.5" />
                    </Button>
                    {isAdmin && <UnitEditDialog unit={unit} />}
                    {isSuperAdmin && <UnitDeleteDialog unit={unit} />}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/inventory/projects">
          <Button variant="ghost" size="icon" data-testid="button-back-to-projects">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate" data-testid="text-page-title">{project?.name || "الوحدات"}</h1>
          <p className="text-muted-foreground text-sm">{units.length} وحدة • {developer?.name || ""}</p>
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          {[
            { mode: "cards" as const, icon: <LayoutGrid className="h-4 w-4" />, label: "بطاقات" },
            { mode: "stacking" as const, icon: <Home className="h-4 w-4" />, label: "مخطط" },
            { mode: "table" as const, icon: <List className="h-4 w-4" />, label: "جدول" },
          ].map(({ mode, icon, label }) => (
            <Button key={mode} variant={viewMode === mode ? "default" : "ghost"} size="sm" onClick={() => setViewMode(mode)} data-testid={`button-view-${mode}`} className="h-7 px-2 text-xs gap-1">
              {icon}{label}
            </Button>
          ))}
        </div>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={o => { setIsAddOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-unit"><Plus className="h-4 w-4 ml-1" />إضافة وحدة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>إضافة وحدة جديدة</DialogTitle></DialogHeader>
              <UnitForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Project Info Panel */}
      {project && (
        <div className="border rounded-xl overflow-hidden">
          {/* Image + Core Info */}
          <div className="flex gap-0 md:flex-row flex-col">
            {projectImage && (
              <div className="md:w-48 md:h-36 h-44 shrink-0 overflow-hidden">
                <img
                  src={projectImage}
                  alt={project.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div className="flex-1 p-4 space-y-2">
              <div className="flex flex-wrap gap-3 items-start justify-between">
                <div>
                  {developer && (
                    <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />{developer.name}
                    </p>
                  )}
                  {(project.minPrice || project.maxPrice) && (
                    <p className="font-bold text-green-700 dark:text-green-300 flex items-center gap-1.5 mt-1">
                      <DollarSign className="h-4 w-4" />
                      {project.minPrice ? `${(project.minPrice/1e6).toFixed(1)} م` : ""}
                      {project.minPrice && project.maxPrice && project.minPrice !== project.maxPrice ? ` – ${(project.maxPrice/1e6).toFixed(1)} م` : ""} جم
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {nawyUrl && (
                    <a href={nawyUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        <ExternalLink className="h-3 w-3 ml-1" />nawy.com
                      </Button>
                    </a>
                  )}
                  {aboutText && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowDescription(!showDescription)}>
                      {showDescription ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      عن الكمبوند
                    </Button>
                  )}
                </div>
              </div>

              {/* Payment plans */}
              {paymentPlans.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <CreditCard className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  {paymentPlans.map((plan, i) => (
                    <span key={i} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200 rounded px-2 py-0.5 border border-blue-100 dark:border-blue-800">{plan}</span>
                  ))}
                </div>
              )}

              {/* Amenities */}
              {project.amenities && project.amenities.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {project.amenities.slice(0, 5).map((a: string) => (
                    <span key={a} className="text-xs bg-muted rounded-full px-2 py-0.5">{a}</span>
                  ))}
                  {project.amenities.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{project.amenities.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description expandable */}
          {showDescription && aboutText && (
            <>
              <Separator />
              <div className="p-4 bg-muted/20">
                <p className="text-sm text-muted-foreground leading-loose whitespace-pre-line">{aboutText}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && (
          <div className="flex gap-3 text-sm">
            {UNIT_STATUSES.map(s => {
              const count = filteredUnits.filter(u => u.status === s.value).length;
              return (
                <button
                  key={s.value}
                  onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === s.value ? `${s.color} text-white` : `${s.bg} ${s.text} border ${s.border}`}`}
                  data-testid={`filter-status-${s.value}`}
                >
                  <span className={`w-2 h-2 rounded-full ${filterStatus === s.value ? 'bg-white' : s.color}`} />
                  {s.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {unitTypes.length > 1 && (
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="نوع الوحدة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {unitTypes.map(type => <SelectItem key={type!} value={type!}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {(filterStatus !== "all" || filterType !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterStatus("all"); setFilterType("all"); }}>
            <X className="h-3 w-3 ml-1" />مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Compare bar */}
      {selectedUnitIds.size >= 2 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg" data-testid="compare-bar">
          <span className="text-sm font-medium text-primary">{selectedUnitIds.size} وحدات مختارة للمقارنة</span>
          <Button variant="default" size="sm" onClick={() => setIsCompareOpen(true)} data-testid="button-compare">
            <GitCompare className="h-4 w-4 ml-1" />مقارنة
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedUnitIds(new Set())} data-testid="button-clear-compare">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main view */}
      {viewMode === "cards" && <CardsView />}
      {viewMode === "stacking" && <StackingPlanView />}
      {viewMode === "table" && <TableView />}

      {/* Modals */}
      {calcUnit && (
        <InstallmentCalculator unit={calcUnit} onClose={() => setCalcUnit(null)} />
      )}
      {isCompareOpen && selectedUnits.length >= 2 && (
        <UnitCompare units={selectedUnits} onClose={() => { setIsCompareOpen(false); setSelectedUnitIds(new Set()); }} />
      )}
    </div>
  );
}
