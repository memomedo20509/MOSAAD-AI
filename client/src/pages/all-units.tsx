import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Home, Loader2, LayoutGrid, List, Building2, BedDouble, Bath, Ruler,
  Tag, CreditCard, ExternalLink, DollarSign, ChevronDown, ChevronUp,
  Phone, Calculator, MapPin, Calendar, X, CheckCircle, Clock, AlertCircle,
  ArrowUpRight, Layers,
} from "lucide-react";
import type { Unit, Project, Developer } from "@shared/schema";
import { useLanguage, getLocalizedName } from "@/lib/i18n";

// Inline mini installment calculator for the sheet
function MiniCalc({ price }: { price: number }) {
  const [years, setYears] = useState(7);
  const [downPct, setDownPct] = useState(10);
  const loan = price * (1 - downPct / 100);
  const monthly = loan / (years * 12);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">المقدم %</label>
          <div className="flex gap-1 mt-1">
            {[5, 10, 15, 20].map(p => (
              <button key={p} onClick={() => setDownPct(p)}
                className={`flex-1 text-xs py-1 rounded border transition-colors ${downPct === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                {p}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">سنوات السداد</label>
          <div className="flex gap-1 mt-1">
            {[5, 7, 10, 12].map(y => (
              <button key={y} onClick={() => setYears(y)}
                className={`flex-1 text-xs py-1 rounded border transition-colors ${years === y ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
        <p className="text-xs text-muted-foreground">القسط الشهري التقريبي</p>
        <p className="text-xl font-bold text-primary">{Math.round(monthly).toLocaleString()} جم</p>
        <p className="text-xs text-muted-foreground mt-0.5">مقدم {downPct}% ({Math.round(price * downPct / 100).toLocaleString()} جم) × {years} سنة</p>
      </div>
    </div>
  );
}

const UNIT_STATUSES = [
  {
    value: "available", label: "متاحة", labelEn: "Available",
    color: "bg-green-500", text: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800",
    icon: CheckCircle,
  },
  {
    value: "reserved", label: "محجوزة", labelEn: "Reserved",
    color: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800",
    icon: Clock,
  },
  {
    value: "sold", label: "مباعة", labelEn: "Sold",
    color: "bg-red-500", text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800",
    icon: AlertCircle,
  },
];

function getStatusInfo(status: string | null) {
  return UNIT_STATUSES.find(s => s.value === status) || UNIT_STATUSES[0];
}

function formatPrice(p: number | null | undefined): string {
  if (!p) return "-";
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(2).replace(/\.?0+$/, "")} م جم`;
  if (p >= 1_000) return `${(p / 1_000).toFixed(0)} ألف جم`;
  return `${p.toLocaleString()} جم`;
}

function formatPriceFull(p: number | null | undefined): string {
  if (!p) return "-";
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
  return m[1].trim().split(" | ");
}

function extractAboutText(desc: string | null): string {
  if (!desc) return "";
  return desc.split("\n📋")[0].trim();
}

function extractNawyUrl(desc: string | null): string {
  if (!desc) return "";
  const m = desc.match(/🔗 المصدر: (https?:\/\/[^\n]+)/);
  return m ? m[1].trim() : "";
}

// ---------- Unit Detail Sheet ----------
function UnitDetailSheet({
  unit, project, developer, open, onClose, isAdmin,
}: {
  unit: Unit | null;
  project: Project | null;
  developer: Developer | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const [showDesc, setShowDesc] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const { language } = useLanguage();

  if (!unit) return null;

  const si = getStatusInfo(unit.status);
  const StatusIcon = si.icon;
  const paymentPlans = extractPaymentPlans(project?.description || null);
  const aboutText = extractAboutText(project?.description || null);
  const nawyUrl = extractNawyUrl(project?.description || null);
  const projectImage = project?.images?.[0];
  const pricePerM2 = calcPricePerM2(unit.price, unit.area);

  const whatsappText = encodeURIComponent(
    `🏠 وحدة للبيع\n` +
    `📌 الكمبوند: ${project?.name || "-"}\n` +
    `🏢 المطور: ${developer?.name || "-"}\n` +
    `🔢 رقم الوحدة: ${unit.unitNumber}\n` +
    `🛏 ${unit.bedrooms || "-"} غرف | 🚿 ${unit.bathrooms || "-"} حمام\n` +
    `📐 المساحة: ${unit.area ? unit.area + " م²" : "-"}\n` +
    `💰 السعر: ${formatPriceFull(unit.price)}\n` +
    (paymentPlans.length ? `💳 السداد: ${paymentPlans[0]}\n` : "") +
    (nawyUrl ? `🔗 ${nawyUrl}` : "")
  );

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent side="left" className="w-full sm:w-[480px] overflow-y-auto p-0" data-testid="unit-detail-sheet">
        {/* Status header bar */}
        <div className="h-1.5 w-full bg-primary/50" />

        <div className="p-5 space-y-5">
          {/* Title */}
          <SheetHeader className="pb-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {isAdmin && <Badge className={`${si.color} text-white text-xs px-2`}>{language === "en" ? si.labelEn : si.label}</Badge>}
                  {unit.type && <span className="text-sm font-medium text-muted-foreground">{(language === "en" && (unit as any).typeEn) ? (unit as any).typeEn : unit.type}</span>}
                </div>
                <SheetTitle className="text-xl">وحدة {unit.unitNumber}</SheetTitle>
                {project && (
                  <Link href={`/inventory/projects/${unit.projectId}/units`}>
                    <p className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline cursor-pointer">
                      <Building2 className="h-3.5 w-3.5" />{project.name}
                      <ArrowUpRight className="h-3 w-3" />
                    </p>
                  </Link>
                )}
                {developer && <p className="text-xs text-muted-foreground">{developer.name}</p>}
              </div>
            </div>
          </SheetHeader>

          {/* Project image */}
          {projectImage && (
            <div className="rounded-xl overflow-hidden h-44 bg-muted">
              <img src={projectImage} alt={project?.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Key stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            {unit.price && (
              <div className={`col-span-2 rounded-xl p-4 ${isAdmin ? `${si.bg} border ${si.border}` : "bg-muted/40 border border-border"}`}>
                <p className="text-xs text-muted-foreground mb-0.5">السعر الإجمالي</p>
                <p className={`text-2xl font-bold ${isAdmin ? si.text : "text-foreground"}`}>{formatPriceFull(unit.price)}</p>
                {unit.area && unit.price && (
                  <p className="text-xs text-muted-foreground mt-0.5">{pricePerM2}</p>
                )}
              </div>
            )}

            {/* Bedrooms */}
            {unit.bedrooms !== null && unit.bedrooms !== undefined && (
              <div className="rounded-xl border bg-muted/30 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <BedDouble className="h-4.5 w-4.5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">غرف النوم</p>
                  <p className="font-bold text-lg leading-tight">{unit.bedrooms}</p>
                </div>
              </div>
            )}

            {/* Bathrooms */}
            {unit.bathrooms !== null && unit.bathrooms !== undefined && (
              <div className="rounded-xl border bg-muted/30 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center shrink-0">
                  <Bath className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الحمامات</p>
                  <p className="font-bold text-lg leading-tight">{unit.bathrooms}</p>
                </div>
              </div>
            )}

            {/* Area */}
            {unit.area && (
              <div className="rounded-xl border bg-muted/30 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                  <Ruler className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المساحة</p>
                  <p className="font-bold text-lg leading-tight">{unit.area} م²</p>
                </div>
              </div>
            )}

            {/* Floor */}
            {unit.floor !== null && unit.floor !== undefined && (
              <div className="rounded-xl border bg-muted/30 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الطابق</p>
                  <p className="font-bold text-lg leading-tight">{unit.floor}</p>
                </div>
              </div>
            )}
          </div>

          {/* Extra details */}
          {(unit.finishing || unit.view) && (
            <div className="space-y-2">
              {unit.finishing && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">التشطيب:</span>
                  <span className="font-medium">{unit.finishing}</span>
                </div>
              )}
              {unit.view && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">الإطلالة:</span>
                  <span className="font-medium">{unit.view}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {unit.notes && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              {unit.notes}
            </div>
          )}

          <Separator />

          {/* Project info */}
          {project && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                معلومات الكمبوند
              </h3>

              {(project.minPrice || project.maxPrice) && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  <span className="text-muted-foreground">نطاق الأسعار:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {project.minPrice ? `${(project.minPrice / 1e6).toFixed(1)}` : ""}
                    {project.minPrice && project.maxPrice && project.minPrice !== project.maxPrice ? ` – ${(project.maxPrice / 1e6).toFixed(1)}` : ""} م جم
                  </span>
                </div>
              )}

              {project.deliveryDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">التسليم:</span>
                  <span className="font-medium">{project.deliveryDate}</span>
                </div>
              )}

              {paymentPlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />أنظمة السداد
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {paymentPlans.map((plan, i) => (
                      <span key={i} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200 rounded-lg px-2.5 py-1 border border-blue-100 dark:border-blue-800 font-medium">
                        {plan}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {project.amenities && project.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {project.amenities.map((a: string) => (
                    <span key={a} className="text-xs bg-muted rounded-full px-2.5 py-1">{a}</span>
                  ))}
                </div>
              )}

              {aboutText && (
                <div>
                  <button
                    onClick={() => setShowDesc(!showDesc)}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    {showDesc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showDesc ? "إخفاء الوصف" : "اقرأ عن الكمبوند"}
                  </button>
                  {showDesc && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-[12] border rounded-lg p-3 bg-muted/20">
                      {aboutText}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              className="w-full"
              variant="default"
              onClick={() => setShowCalc(!showCalc)}
              data-testid="button-calc-installment"
            >
              <Calculator className="h-4 w-4 ml-2" />
              احسب القسط الشهري
            </Button>

            <div className="grid grid-cols-2 gap-2">
              {nawyUrl && (
                <a href={nawyUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full text-xs" size="sm">
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    nawy.com
                  </Button>
                </a>
              )}
              <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full text-xs text-green-600 border-green-200 hover:bg-green-50" size="sm">
                  <Phone className="h-3.5 w-3.5 ml-1" />
                  شارك واتساب
                </Button>
              </a>
            </div>

            <Link href={`/inventory/projects/${unit.projectId}/units`}>
              <Button variant="ghost" className="w-full text-xs" size="sm">
                <Building2 className="h-3.5 w-3.5 ml-1" />
                عرض كل وحدات الكمبوند
              </Button>
            </Link>
          </div>

          {/* Installment calculator */}
          {showCalc && unit?.price && (
            <div className="border rounded-xl p-4 bg-muted/10 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />حاسبة القسط الشهري
              </p>
              <MiniCalc price={unit.price} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------- Main Page ----------
export default function AllUnitsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBedrooms, setFilterBedrooms] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: developers = [] } = useQuery<Developer[]>({ queryKey: ["/api/developers"] });
  const { data: units = [], isLoading } = useQuery<Unit[]>({ queryKey: ["/api/units"] });

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);
  const developerMap = useMemo(() => Object.fromEntries(developers.map(d => [d.id, d])), [developers]);

  const unitTypes = useMemo(() => [...new Set(units.map(u => u.type).filter(Boolean))].sort(), [units]);
  const bedroomOptions = useMemo(() => [...new Set(units.map(u => u.bedrooms).filter(b => b !== null && b !== undefined))].sort((a, b) => (a || 0) - (b || 0)), [units]);
  const locationOptions = useMemo(() => {
    const locs = units
      .map(u => projectMap[u.projectId]?.location)
      .filter((l): l is string => !!l);
    return [...new Set(locs)].sort();
  }, [units, projectMap]);

  const filteredUnits = useMemo(() => units.filter(unit => {
    if (filterType !== "all" && unit.type !== filterType) return false;
    if (filterBedrooms !== "all" && String(unit.bedrooms) !== filterBedrooms) return false;
    if (selectedProjectId !== "all" && unit.projectId !== selectedProjectId) return false;
    if (filterLocation !== "all" && projectMap[unit.projectId]?.location !== filterLocation) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const proj = projectMap[unit.projectId];
      if (
        !unit.unitNumber?.toLowerCase().includes(q) &&
        !unit.type?.toLowerCase().includes(q) &&
        !proj?.name?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [units, filterType, filterBedrooms, filterLocation, selectedProjectId, searchQuery, projectMap]);

  const stats = useMemo(() => ({
    total: filteredUnits.length,
    available: filteredUnits.filter(u => u.status === "available").length,
  }), [filteredUnits]);

  const selectedProject = selectedUnit ? projectMap[selectedUnit.projectId] || null : null;
  const selectedDeveloper = selectedProject ? developerMap[selectedProject.developerId] || null : null;

  const hasActiveFilters = filterType !== "all" || filterBedrooms !== "all" || filterLocation !== "all" || selectedProjectId !== "all" || searchQuery !== "";

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-units-title">كل الوحدات</h1>
          <p className="text-sm text-muted-foreground">{units.length} وحدة في {projects.length} مشروع</p>
        </div>
        {/* View toggle */}
        <div className="flex gap-1 border rounded-lg p-0.5">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-7 px-3 text-xs gap-1" onClick={() => setViewMode("grid")} data-testid="button-view-grid">
            <LayoutGrid className="h-3.5 w-3.5" />بطاقات
          </Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-7 px-3 text-xs gap-1" onClick={() => setViewMode("table")} data-testid="button-view-table">
            <List className="h-3.5 w-3.5" />جدول
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {isAdmin ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "الإجمالي", value: stats.total, color: "text-foreground", bg: "bg-muted/50" },
            { label: "متاحة", value: stats.available, color: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-950" },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-3 text-center bg-muted/50 inline-block">
          <p className="text-xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">إجمالي الوحدات</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الوحدة أو اسم الكمبوند..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-9 text-sm h-9"
            data-testid="input-search-units"
          />
        </div>

        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[180px] h-9 text-xs" data-testid="filter-project">
            <SelectValue placeholder="كل الكمبوندات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الكمبوندات</SelectItem>
            {projects.filter(p => units.some(u => u.projectId === p.id)).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {locationOptions.length > 0 && (
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[160px] h-9 text-xs" data-testid="filter-location">
              <MapPin className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
              <SelectValue placeholder="كل المناطق" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المناطق</SelectItem>
              {locationOptions.map(loc => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {unitTypes.length > 1 && (
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="نوع الوحدة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {unitTypes.map(t => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {bedroomOptions.length > 1 && (
          <Select value={filterBedrooms} onValueChange={setFilterBedrooms}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="غرف النوم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الغرف</SelectItem>
              {bedroomOptions.map(b => <SelectItem key={String(b)} value={String(b)}>{b} غرف</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => { setFilterType("all"); setFilterBedrooms("all"); setFilterLocation("all"); setSelectedProjectId("all"); setSearchQuery(""); }}
          >
            <X className="h-3.5 w-3.5 ml-1" />مسح
          </Button>
        )}
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">{filteredUnits.length} وحدة مطابقة للفلاتر</p>
      )}

      {/* Units display */}
      {filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Home className="h-12 w-12 mb-3 opacity-30" />
          <p>لا توجد وحدات مطابقة</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredUnits.map(unit => {
            const si = getStatusInfo(unit.status);
            const proj = projectMap[unit.projectId];
            const dev = proj ? developerMap[proj.developerId] : null;
            const projImage = proj?.images?.[0];
            const pricePerM2 = unit.price && unit.area ? Math.round(unit.price / unit.area).toLocaleString() : null;

            return (
              <Card
                key={unit.id}
                className="overflow-hidden border hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedUnit(unit)}
                data-testid={`card-unit-${unit.id}`}
              >
                {/* Project image or color strip */}
                {projImage ? (
                  <div className="h-28 overflow-hidden relative">
                    <img
                      src={projImage}
                      alt={proj?.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between">
                      {isAdmin && <Badge className={`${si.color} text-white text-[10px] px-1.5`}>{language === "en" ? si.labelEn : si.label}</Badge>}
                      {unit.type && <span className="text-white text-[10px] font-medium bg-black/40 rounded px-1.5 py-0.5">{(language === "en" && (unit as any).typeEn) ? (unit as any).typeEn : unit.type}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="h-1.5 w-full bg-primary/40" />
                )}

                <CardContent className="p-3 space-y-2">
                  {/* Unit type (non-admin) or status + type (admin) */}
                  {!projImage && (
                    <div className="flex items-center justify-between">
                      {isAdmin
                        ? <Badge variant="outline" className={`text-xs ${si.text}`}>{language === "en" ? si.labelEn : si.label}</Badge>
                        : <span />
                      }
                      {unit.type && <span className="text-xs font-medium text-muted-foreground">{(language === "en" && (unit as any).typeEn) ? (unit as any).typeEn : unit.type}</span>}
                    </div>
                  )}

                  {/* Project name */}
                  {proj && (
                    <p className="text-xs font-semibold truncate" title={getLocalizedName(proj.name, (proj as any).nameEn, language)}>
                      {getLocalizedName(proj.name, (proj as any).nameEn, language)}
                    </p>
                  )}

                  {/* Unit number */}
                  <p className="text-sm font-bold">وحدة {unit.unitNumber}</p>

                  {/* Specs row */}
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                    {unit.bedrooms !== null && unit.bedrooms !== undefined && (
                      <span className="flex items-center gap-0.5"><BedDouble className="h-3 w-3" />{unit.bedrooms}</span>
                    )}
                    {unit.bathrooms !== null && unit.bathrooms !== undefined && (
                      <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" />{unit.bathrooms}</span>
                    )}
                    {unit.area && (
                      <span className="flex items-center gap-0.5"><Ruler className="h-3 w-3" />{unit.area} م²</span>
                    )}
                    {unit.floor !== null && unit.floor !== undefined && (
                      <span className="flex items-center gap-0.5"><Layers className="h-3 w-3" />ط{unit.floor}</span>
                    )}
                  </div>

                  {/* Price */}
                  {unit.price ? (
                    <div className={`rounded-lg px-2.5 py-2 ${isAdmin ? si.bg : "bg-muted/40"}`}>
                      <p className={`font-bold text-sm ${isAdmin ? si.text : "text-foreground"}`}>{formatPrice(unit.price)}</p>
                      {pricePerM2 && <p className="text-[10px] text-muted-foreground">{pricePerM2} جم/م²</p>}
                    </div>
                  ) : null}

                  {/* Finishing */}
                  {unit.finishing && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Tag className="h-2.5 w-2.5" />{unit.finishing}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // TABLE VIEW
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-right">
                  <th className="px-4 py-3 font-medium text-muted-foreground">الكمبوند</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">رقم الوحدة</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">النوع</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">غرف</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">حمام</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">المساحة</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">السعر</th>
                  {isAdmin && <th className="px-4 py-3 font-medium text-muted-foreground">الحالة</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit, i) => {
                  const si = getStatusInfo(unit.status);
                  const proj = projectMap[unit.projectId];
                  return (
                    <tr
                      key={unit.id}
                      className={`border-t hover:bg-muted/40 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      onClick={() => setSelectedUnit(unit)}
                      data-testid={`row-unit-${unit.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {proj?.images?.[0] ? (
                            <img
                              src={proj.images[0]}
                              alt={proj.name}
                              className="w-8 h-8 rounded object-cover shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : <div className="w-8 h-8 rounded bg-muted shrink-0 flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>}
                          <span className="font-medium truncate max-w-[140px]" title={getLocalizedName(proj?.name, (proj as any)?.nameEn, language)}>{getLocalizedName(proj?.name || "", (proj as any)?.nameEn, language) || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">{unit.unitNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{(language === "en" && (unit as any).typeEn) ? (unit as any).typeEn : (unit.type || "-")}</td>
                      <td className="px-4 py-3 text-center">{unit.bedrooms ?? "-"}</td>
                      <td className="px-4 py-3 text-center">{unit.bathrooms ?? "-"}</td>
                      <td className="px-4 py-3">{unit.area ? `${unit.area} م²` : "-"}</td>
                      <td className="px-4 py-3 font-semibold">{unit.price ? `${unit.price.toLocaleString()} جم` : "-"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Badge className={`${si.color} text-white text-xs`}>{language === "en" ? si.labelEn : si.label}</Badge>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unit detail sheet */}
      <UnitDetailSheet
        unit={selectedUnit}
        project={selectedProject}
        developer={selectedDeveloper}
        open={!!selectedUnit}
        onClose={() => setSelectedUnit(null)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
