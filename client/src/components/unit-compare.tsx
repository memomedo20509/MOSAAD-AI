import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { Calculator } from "lucide-react";
import type { Unit, Project } from "@shared/schema";
import { InstallmentCalculator } from "./installment-calculator";

interface UnitCompareProps {
  units: Unit[];
  projects?: Project[];
  isOpen: boolean;
  onClose: () => void;
}

interface CalcResult {
  monthly: number;
}

function quickCalc(price: number, downPct = 20, years = 10, rate = 10): CalcResult {
  const loan = price * (1 - downPct / 100);
  if (rate === 0) return { monthly: loan / (years * 12) };
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  const monthly = (loan * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  return { monthly };
}

export function UnitCompare({ units, projects, isOpen, onClose }: UnitCompareProps) {
  const { t } = useLanguage();
  const [calcUnit, setCalcUnit] = useState<Unit | null>(null);

  const getProject = (unit: Unit) => projects?.find((p) => p.id === unit.projectId);

  const fmt = (n: number | null | undefined) =>
    n != null ? Math.round(n).toLocaleString() : "-";

  const statusLabel: Record<string, string> = {
    available: t.available,
    reserved: t.reserved,
    sold: t.sold,
  };

  const rows: { key: string; label: string; getValue: (u: Unit) => string | number }[] = [
    { key: "project", label: t.project, getValue: (u) => getProject(u)?.name || "-" },
    { key: "unitNumber", label: t.unitNumber, getValue: (u) => u.unitNumber },
    { key: "type", label: t.type, getValue: (u) => u.type || "-" },
    { key: "floor", label: t.floor, getValue: (u) => u.floor ?? "-" },
    { key: "area", label: t.area, getValue: (u) => u.area ? `${u.area} m²` : "-" },
    { key: "bedrooms", label: t.bedrooms, getValue: (u) => u.bedrooms ?? "-" },
    { key: "bathrooms", label: t.bathrooms, getValue: (u) => u.bathrooms ?? "-" },
    { key: "finishing", label: t.finishing, getValue: (u) => u.finishing || "-" },
    { key: "status", label: t.status, getValue: (u) => statusLabel[u.status || ""] || u.status || "-" },
    { key: "price", label: `${t.price} (${t.currency})`, getValue: (u) => u.price ? fmt(u.price) : "-" },
    {
      key: "installment",
      label: `${t.monthlyInstallment} (${t.currency})`,
      getValue: (u) => {
        if (!u.price) return "-";
        const { monthly } = quickCalc(u.price);
        return fmt(monthly);
      },
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t.unitComparison}</DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-start p-3 bg-muted font-medium border w-32">{t.attribute}</th>
                  {units.map((unit) => (
                    <th key={unit.id} className="p-3 bg-muted border text-center min-w-[140px]">
                      <div className="font-medium">{unit.unitNumber}</div>
                      <div className="text-xs text-muted-foreground">{getProject(unit)?.name || "-"}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs mt-1 gap-1"
                        onClick={() => setCalcUnit(unit)}
                        data-testid={`button-calc-in-compare-${unit.id}`}
                      >
                        <Calculator className="h-3 w-3" />
                        {t.calculateInstallment}
                      </Button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.key} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <td className="p-3 border font-medium text-muted-foreground">{row.label}</td>
                    {units.map((unit) => {
                      const val = row.getValue(unit);
                      const isPrice = row.key === "price" || row.key === "installment";
                      return (
                        <td
                          key={unit.id}
                          className={`p-3 border text-center ${isPrice ? "font-semibold text-primary" : ""}`}
                          data-testid={`compare-${row.key}-${unit.id}`}
                        >
                          {row.key === "status" ? (
                            <Badge variant="outline">{val}</Badge>
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            * {t.monthlyInstallment}: 20% {t.downPaymentPercent}, 10 {t.numberOfYears}, 10% {t.annualInterestRate}
          </p>
        </DialogContent>
      </Dialog>

      {calcUnit && (
        <InstallmentCalculator
          unit={calcUnit}
          projectName={getProject(calcUnit)?.name}
          isOpen={!!calcUnit}
          onClose={() => setCalcUnit(null)}
        />
      )}
    </>
  );
}
