import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Copy, Check } from "lucide-react";
import type { Unit } from "@shared/schema";

interface InstallmentCalculatorProps {
  unit?: Unit;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CalcResult {
  monthly: number;
  total: number;
  interest: number;
  loan: number;
}

function calcInstallment(price: number, downPayment: number, years: number, rate: number): CalcResult {
  const loan = price - downPayment;
  if (rate === 0) {
    const monthly = loan / (years * 12);
    return { monthly, total: price, interest: 0, loan };
  }
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  const monthly = (loan * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  const total = monthly * n + downPayment;
  const interest = total - price;
  return { monthly, total, interest, loan };
}

export function InstallmentCalculator({ unit, projectName, isOpen, onClose }: InstallmentCalculatorProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [price, setPrice] = useState<string>(unit?.price ? String(unit.price) : "");
  const [downPayment, setDownPayment] = useState<string>("");
  const [downPaymentPercent, setDownPaymentPercent] = useState<string>("20");
  const [usePercent, setUsePercent] = useState(false);
  const [years, setYears] = useState<string>("10");
  const [rate, setRate] = useState<string>("10");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCalculate = () => {
    const p = parseFloat(price) || 0;
    const dp = usePercent
      ? (parseFloat(downPaymentPercent) || 0) / 100 * p
      : parseFloat(downPayment) || 0;
    const y = parseFloat(years) || 1;
    const r = parseFloat(rate) || 0;
    if (p <= 0) return;
    setResult(calcInstallment(p, dp, y, r));
  };

  const handleDownPaymentChange = (val: string) => {
    setDownPayment(val);
    const p = parseFloat(price) || 0;
    if (p > 0) {
      const dp = parseFloat(val) || 0;
      setDownPaymentPercent(String(Math.round((dp / p) * 100)));
    }
  };

  const handleDownPaymentPercentChange = (val: string) => {
    setDownPaymentPercent(val);
    const p = parseFloat(price) || 0;
    const pct = parseFloat(val) || 0;
    setDownPayment(String(Math.round((pct / 100) * p)));
  };

  const fmt = (n: number) => Math.round(n).toLocaleString();

  const handleCopyToShare = () => {
    if (!result) return;
    const dp = usePercent
      ? (parseFloat(downPaymentPercent) || 0) / 100 * (parseFloat(price) || 0)
      : parseFloat(downPayment) || 0;

    let msg = "";
    if (language === "ar") {
      msg = `🏠 ${t.shareMessage}\n`;
      if (projectName) msg += `📌 المشروع: ${projectName}\n`;
      if (unit?.unitNumber) msg += `🔑 الوحدة: ${unit.unitNumber}\n`;
      if (unit?.type) msg += `🏗️ النوع: ${unit.type}\n`;
      if (unit?.area) msg += `📐 المساحة: ${unit.area} م²\n`;
      if (unit?.floor) msg += `🏢 الطابق: ${unit.floor}\n`;
      if (unit?.finishing) msg += `✨ التشطيب: ${unit.finishing}\n`;
      msg += `\n💰 السعر الإجمالي: ${fmt(parseFloat(price) || 0)} ${t.currency}\n`;
      msg += `💵 الدفعة الأولى: ${fmt(dp)} ${t.currency}\n`;
      msg += `📅 مدة السداد: ${years} سنوات\n`;
      msg += `📊 الفائدة السنوية: ${rate}%\n`;
      msg += `\n✅ القسط الشهري: ${fmt(result.monthly)} ${t.currency}\n`;
      msg += `💳 إجمالي المبلغ: ${fmt(result.total)} ${t.currency}\n`;
      msg += `📈 إجمالي الفائدة: ${fmt(result.interest)} ${t.currency}\n`;
    } else {
      msg = `🏠 ${t.shareMessage}\n`;
      if (projectName) msg += `📌 Project: ${projectName}\n`;
      if (unit?.unitNumber) msg += `🔑 Unit: ${unit.unitNumber}\n`;
      if (unit?.type) msg += `🏗️ Type: ${unit.type}\n`;
      if (unit?.area) msg += `📐 Area: ${unit.area} sqm\n`;
      if (unit?.floor) msg += `🏢 Floor: ${unit.floor}\n`;
      if (unit?.finishing) msg += `✨ Finishing: ${unit.finishing}\n`;
      msg += `\n💰 Total Price: ${fmt(parseFloat(price) || 0)} ${t.currency}\n`;
      msg += `💵 Down Payment: ${fmt(dp)} ${t.currency}\n`;
      msg += `📅 Duration: ${years} years\n`;
      msg += `📊 Annual Rate: ${rate}%\n`;
      msg += `\n✅ Monthly Installment: ${fmt(result.monthly)} ${t.currency}\n`;
      msg += `💳 Total Payment: ${fmt(result.total)} ${t.currency}\n`;
      msg += `📈 Total Interest: ${fmt(result.interest)} ${t.currency}\n`;
    }

    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      toast({ title: t.copiedToClipboard });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t.installmentCalculator}
            {unit?.unitNumber && <span className="text-muted-foreground text-sm font-normal">— {t.unit} {unit.unitNumber}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calc-price">{t.unitPrice} ({t.currency})</Label>
            <Input
              id="calc-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              data-testid="input-calc-price"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="calc-dp">{t.downPaymentAmount} ({t.currency})</Label>
              <Input
                id="calc-dp"
                type="number"
                value={downPayment}
                onChange={(e) => { setUsePercent(false); handleDownPaymentChange(e.target.value); }}
                placeholder="0"
                data-testid="input-calc-downpayment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-dp-pct">{t.downPaymentPercent}</Label>
              <Input
                id="calc-dp-pct"
                type="number"
                value={downPaymentPercent}
                onChange={(e) => { setUsePercent(true); handleDownPaymentPercentChange(e.target.value); }}
                placeholder="20"
                min="0"
                max="100"
                data-testid="input-calc-downpayment-percent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="calc-years">{t.numberOfYears}</Label>
              <Input
                id="calc-years"
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="10"
                min="1"
                max="30"
                data-testid="input-calc-years"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calc-rate">{t.annualInterestRate}</Label>
              <Input
                id="calc-rate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="10"
                min="0"
                step="0.1"
                data-testid="input-calc-rate"
              />
            </div>
          </div>

          <Button onClick={handleCalculate} className="w-full" data-testid="button-calculate">
            <Calculator className="h-4 w-4 mr-2" />
            {t.calculate}
          </Button>

          {result && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-background rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">{t.monthlyInstallment}</p>
                    <p className="text-xl font-bold text-primary" data-testid="text-monthly-installment">
                      {fmt(result.monthly)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.currency}</p>
                  </div>
                  <div className="text-center p-3 bg-background rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">{t.totalPayment}</p>
                    <p className="text-xl font-bold" data-testid="text-total-payment">
                      {fmt(result.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.currency}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-background rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">{t.loanAmount}</p>
                    <p className="font-semibold" data-testid="text-loan-amount">{fmt(result.loan)}</p>
                    <p className="text-xs text-muted-foreground">{t.currency}</p>
                  </div>
                  <div className="text-center p-2 bg-background rounded-md border">
                    <p className="text-xs text-muted-foreground mb-1">{t.totalInterest}</p>
                    <p className="font-semibold text-orange-600" data-testid="text-total-interest">{fmt(result.interest)}</p>
                    <p className="text-xs text-muted-foreground">{t.currency}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleCopyToShare}
                  data-testid="button-copy-to-share"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? t.copiedToClipboard : t.copyToShare}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
