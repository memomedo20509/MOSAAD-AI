import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, ShoppingCart, Building2 } from "lucide-react";
import type { Company } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { normalizeIndustry } from "@/lib/legacy-normalizers";

const INDUSTRY_IDS = [
  "real_estate",
  "automotive",
  "insurance",
  "education",
  "healthcare",
  "technology",
  "retail",
  "hospitality",
  "finance",
  "other",
] as const;

export default function SettingsPage() {
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const INDUSTRY_LABELS: Record<string, string> = {
    real_estate: t.onboardingIndustryRealEstate,
    automotive: t.onboardingIndustryCars,
    insurance: t.onboardingIndustryInsurance,
    education: t.onboardingIndustryEducation,
    healthcare: t.onboardingIndustryHealthcare,
    technology: t.onboardingIndustryTech,
    retail: t.onboardingIndustryRetail,
    hospitality: t.onboardingIndustryHospitality,
    finance: t.onboardingIndustryFinance,
    other: t.onboardingIndustryOther,
  };

  const { data: company, isLoading } = useQuery<Company>({ queryKey: ["/api/companies/me"] });

  const [form, setForm] = useState({
    name: "",
    industry: "",
    businessType: "service",
    workingHours: "",
    timezone: "",
    primaryColor: "#6366f1",
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        industry: normalizeIndustry(company.industry, INDUSTRY_IDS),
        businessType: company.businessType ?? "service",
        workingHours: company.workingHours ?? "",
        timezone: company.timezone ?? "",
        primaryColor: company.primaryColor ?? "#6366f1",
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("PATCH", "/api/companies/me", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: t.settingsSavedSuccess });
    },
    onError: () => toast({ title: t.settingsSavedError, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl" data-testid="page-settings" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.companySettings}</h1>
        <p className="text-muted-foreground">{t.companySettingsSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t.companyProfileCard}</CardTitle>
          </div>
          <CardDescription>{t.companyProfileDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>{t.businessTypeLabel}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, businessType: "service" }))}
                    data-testid="button-business-type-service"
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer ${
                      form.businessType === "service"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${form.businessType === "service" ? "bg-primary/10" : "bg-muted"}`}>
                      <Briefcase className={`h-5 w-5 ${form.businessType === "service" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{t.businessTypeService}</p>
                      <p className="text-xs text-muted-foreground">{t.businessTypeServiceDesc}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, businessType: "ecommerce" }))}
                    data-testid="button-business-type-ecommerce"
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer ${
                      form.businessType === "ecommerce"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${form.businessType === "ecommerce" ? "bg-primary/10" : "bg-muted"}`}>
                      <ShoppingCart className={`h-5 w-5 ${form.businessType === "ecommerce" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">{t.businessTypeEcommerce}</p>
                      <p className="text-xs text-muted-foreground">{t.businessTypeEcommerceDesc}</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-company-name">{t.companyNameSetting}</Label>
                <Input
                  id="settings-company-name"
                  data-testid="input-company-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t.companyNamePlaceholderSetting}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-industry">{t.industryLabel}</Label>
                <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                  <SelectTrigger id="settings-industry" data-testid="select-industry">
                    <SelectValue placeholder={t.industryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_IDS.map(id => (
                      <SelectItem key={id} value={id}>{INDUSTRY_LABELS[id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-working-hours">{t.workingHoursLabel}</Label>
                <Input
                  id="settings-working-hours"
                  data-testid="input-working-hours"
                  value={form.workingHours}
                  onChange={e => setForm(f => ({ ...f, workingHours: e.target.value }))}
                  placeholder={t.workingHoursPlaceholder}
                />
              </div>

              <Button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateMutation.isPending ? t.saving : t.saveChanges}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
