import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Building2, User, CheckCircle2, Loader2, ChevronRight, ChevronLeft, Zap, Shield, Clock, Smartphone, SlidersHorizontal, Rocket } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { WAChatMockup } from "@/components/public-mockups";
import { useLanguage } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";

const INDUSTRIES_AR = [
  "عقارات", "تجزئة وتجارة إلكترونية", "تعليم", "صحة وطب",
  "سيارات", "سفر وسياحة", "خدمات مالية", "تقنية", "أغذية ومطاعم", "أخرى"
];

const INDUSTRIES_EN = [
  "Real Estate", "Retail & E-commerce", "Education", "Health & Medical",
  "Automotive", "Travel & Tourism", "Financial Services", "Technology", "Food & Restaurants", "Other"
];

const SIZES_AR = [
  { value: "1-5", label: "1-5 موظفين" },
  { value: "6-20", label: "6-20 موظفاً" },
  { value: "21-50", label: "21-50 موظفاً" },
  { value: "51-200", label: "51-200 موظفاً" },
  { value: "200+", label: "أكثر من 200 موظف" },
];

const SIZES_EN = [
  { value: "1-5", label: "1-5 employees" },
  { value: "6-20", label: "6-20 employees" },
  { value: "21-50", label: "21-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "200+", label: "200+ employees" },
];

interface FormData {
  companyName: string;
  industry: string;
  size: string;
  ownerName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language, isRTL } = useLanguage();
  const [step, setStep] = useState(1);

  const { data: authConfig } = useQuery<{ googleEnabled: boolean }>({
    queryKey: ["/api/auth/config"],
  });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    companyName: "",
    industry: "",
    size: "",
    ownerName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const INDUSTRIES = language === "ar" ? INDUSTRIES_AR : INDUSTRIES_EN;
  const SIZES = language === "ar" ? SIZES_AR : SIZES_EN;

  const STEPS = [t.pub_regStep1, t.pub_regStep2, t.pub_regStep3];

  const BENEFITS = [
    { icon: Zap, title: t.pub_regBenefit1Title, desc: t.pub_regBenefit1Desc },
    { icon: Shield, title: t.pub_regBenefit2Title, desc: t.pub_regBenefit2Desc },
    { icon: Clock, title: t.pub_regBenefit3Title, desc: t.pub_regBenefit3Desc },
  ];

  const ONBOARDING_STEPS = [
    {
      icon: Smartphone,
      number: t.pub_regOnboarding1Num,
      title: t.pub_regOnboarding1Title,
      desc: t.pub_regOnboarding1Desc,
      color: "from-indigo-500 to-indigo-400",
    },
    {
      icon: SlidersHorizontal,
      number: t.pub_regOnboarding2Num,
      title: t.pub_regOnboarding2Title,
      desc: t.pub_regOnboarding2Desc,
      color: "from-purple-500 to-purple-400",
    },
    {
      icon: Rocket,
      number: t.pub_regOnboarding3Num,
      title: t.pub_regOnboarding3Title,
      desc: t.pub_regOnboarding3Desc,
      color: "from-pink-500 to-purple-500",
    },
  ];

  const update = (key: keyof FormData, value: string) => setForm(f => ({ ...f, [key]: value }));

  const validateStep1 = () => {
    if (!form.companyName.trim()) {
      toast({ title: t.pub_regErrorTitle, description: t.pub_regValidCompanyName, variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.ownerName.trim()) {
      toast({ title: t.pub_regErrorTitle, description: t.pub_regValidOwnerName, variant: "destructive" });
      return false;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      toast({ title: t.pub_regErrorTitle, description: t.pub_regValidEmail, variant: "destructive" });
      return false;
    }
    if (!form.username.trim() || form.username.length < 3) {
      toast({ title: t.pub_regErrorTitle, description: t.pub_regValidUsername, variant: "destructive" });
      return false;
    }
    if (form.password.length < 6) {
      toast({ title: t.pub_regErrorTitle, description: t.pub_regValidPassword, variant: "destructive" });
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: t.pub_regErrorTitle, description: t.pub_regValidPasswordMatch, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiRequest("POST", "/api/public/register", {
        companyName: form.companyName,
        industry: form.industry,
        size: form.size,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        username: form.username,
        password: form.password,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: t.pub_regSuccess, description: t.pub_regSuccessDesc });
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      const msg = err.message || t.pub_regErrorTitle;
      toast({ title: t.pub_regErrorTitle, description: msg, variant: "destructive" });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>{language === "ar" ? "إنشاء حساب - SalesBot AI" : "Create Account - SalesBot AI"}</title>
      <meta name="description" content={language === "ar" ? "سجّل شركتك في SalesBot AI وابدأ تجربتك المجانية لمدة 14 يوماً." : "Register your company on SalesBot AI and start your 14-day free trial."} />

      <section className="min-h-screen pt-16 grid lg:grid-cols-2">
        {/* Left column — dark gradient brand side */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 px-12 py-16 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 h-48 w-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold text-white leading-snug mb-3">
              {t.pub_regHeadline1}{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                {t.pub_regHeadline2}
              </span>
            </h2>
            <p className="text-indigo-200 text-base mb-10 leading-relaxed">
              {t.pub_regHeadlineDesc}
            </p>

            <div className="space-y-5">
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <Icon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{title}</div>
                    <div className="text-indigo-300 text-xs mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-4">
                {t.pub_regOnboardingTitle}
              </p>
              <div className="space-y-3" data-testid="onboarding-flow">
                {ONBOARDING_STEPS.map(({ icon: Icon, number, title, desc, color }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-lg`} data-testid={`onboarding-step-icon-${i + 1}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {i < ONBOARDING_STEPS.length - 1 && (
                        <div className="w-px h-5 bg-white/15 mt-1" />
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-400 text-xs font-bold">{number}.</span>
                        <span className="text-white font-semibold text-sm" data-testid={`onboarding-step-title-${i + 1}`}>{title}</span>
                      </div>
                      <p className="text-indigo-300 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {["AS", "SA", "MO", "NZ"].map((initials, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full border-2 border-indigo-900 flex items-center justify-center text-white text-[10px] font-bold ${
                      ["bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-pink-500"][i]
                    }`}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-indigo-200 text-xs leading-relaxed">
                <span className="text-white font-semibold">{t.pub_regSocialProof}</span>{t.pub_regSocialProofSuffix}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10">
            <WAChatMockup />
          </div>
        </div>

        {/* Right column — form */}
        <div className="flex flex-col justify-center items-center px-6 py-12 bg-gray-50 dark:bg-gray-950">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-register-headline">
                {t.pub_regTitle}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">{t.pub_regSubtitle}</p>
            </div>

            {authConfig?.googleEnabled && (
              <div className="mb-6">
                <a href="/api/auth/google" data-testid="button-google-signin-register">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-gray-300 hover:bg-gray-50"
                    asChild={false}
                  >
                    <SiGoogle className="h-4 w-4 text-[#4285F4]" />
                    {t.continueWithGoogle}
                  </Button>
                </a>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 dark:bg-gray-950 px-2 text-gray-400">{t.orDivider}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEPS.map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold transition-colors ${
                      step > i + 1
                        ? "bg-green-500 text-white"
                        : step === i + 1
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                          : "bg-gray-200 text-gray-400"
                    }`}
                    data-testid={`step-indicator-${i + 1}`}
                  >
                    {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${step === i + 1 ? "text-indigo-600 font-medium" : "text-gray-400"}`}>
                    {label}
                  </span>
                  {i < STEPS.length - 1 && <div className="h-px w-6 bg-gray-200" />}
                </div>
              ))}
            </div>

            <Card className="shadow-xl border border-gray-100">
              <CardContent className="p-6">
                {/* Step 1: Company info */}
                {step === 1 && (
                  <div className="space-y-5" data-testid="register-step-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <h2 className="font-bold text-gray-900">{t.pub_regCompanyInfoTitle}</h2>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-company">{t.pub_regCompanyName}</Label>
                      <Input
                        id="reg-company"
                        value={form.companyName}
                        onChange={e => update("companyName", e.target.value)}
                        placeholder={t.pub_regCompanyPlaceholder}
                        data-testid="input-reg-company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.pub_regIndustry}</Label>
                      <Select value={form.industry} onValueChange={v => update("industry", v)}>
                        <SelectTrigger data-testid="select-reg-industry">
                          <SelectValue placeholder={t.pub_regIndustryPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(ind => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.pub_regSize}</Label>
                      <Select value={form.size} onValueChange={v => update("size", v)}>
                        <SelectTrigger data-testid="select-reg-size">
                          <SelectValue placeholder={t.pub_regSizePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {SIZES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      onClick={handleNext}
                      data-testid="button-reg-next-1"
                    >
                      {t.pub_regNext}
                      {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                {/* Step 2: Owner info */}
                {step === 2 && (
                  <div className="space-y-4" data-testid="register-step-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <h2 className="font-bold text-gray-900">{t.pub_regOwnerInfoTitle}</h2>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-owner">{t.pub_regOwnerName}</Label>
                      <Input
                        id="reg-owner"
                        value={form.ownerName}
                        onChange={e => update("ownerName", e.target.value)}
                        placeholder={t.pub_regOwnerPlaceholder}
                        data-testid="input-reg-owner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">{t.pub_regEmail}</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={form.email}
                        onChange={e => update("email", e.target.value)}
                        placeholder={t.pub_regEmailPlaceholder}
                        data-testid="input-reg-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">{t.pub_regPhone}</Label>
                      <Input
                        id="reg-phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => update("phone", e.target.value)}
                        placeholder={t.pub_regPhonePlaceholder}
                        data-testid="input-reg-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">{t.pub_regUsername}</Label>
                      <Input
                        id="reg-username"
                        value={form.username}
                        onChange={e => update("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                        placeholder={t.pub_regUsernamePlaceholder}
                        dir="ltr"
                        data-testid="input-reg-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t.pub_regPassword}</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={form.password}
                        onChange={e => update("password", e.target.value)}
                        placeholder={t.pub_regPasswordPlaceholder}
                        data-testid="input-reg-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">{t.pub_regConfirmPassword}</Label>
                      <Input
                        id="reg-confirm"
                        type="password"
                        value={form.confirmPassword}
                        onChange={e => update("confirmPassword", e.target.value)}
                        data-testid="input-reg-confirm"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(1)} data-testid="button-reg-back-2">
                        {isRTL ? <ChevronRight className="h-4 w-4 ml-1" /> : <ChevronLeft className="h-4 w-4 mr-1" />}
                        {t.pub_regBack}
                      </Button>
                      <Button
                        className="flex-1 gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        onClick={handleNext}
                        data-testid="button-reg-next-2"
                      >
                        {t.pub_regNext}
                        {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                  <div className="space-y-5" data-testid="register-step-3">
                    <div className="text-center mb-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="h-7 w-7 text-white" />
                      </div>
                      <h2 className="font-bold text-gray-900 text-xl">{t.pub_regConfirmTitle}</h2>
                      <p className="text-gray-500 text-sm">{t.pub_regConfirmSubtitle}</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border border-gray-100">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t.pub_regSummaryCompany}</span>
                        <span className="font-medium text-gray-900" data-testid="summary-company">{form.companyName}</span>
                      </div>
                      {form.industry && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t.pub_regSummaryIndustry}</span>
                          <span className="font-medium text-gray-900">{form.industry}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t.pub_regSummaryName}</span>
                        <span className="font-medium text-gray-900" data-testid="summary-owner">{form.ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t.pub_regSummaryEmail}</span>
                        <span className="font-medium text-gray-900" data-testid="summary-email">{form.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t.pub_regSummaryUsername}</span>
                        <span className="font-medium text-gray-900" dir="ltr">{form.username}</span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800 border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> {t.pub_regFreeTrialNote1}</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> {t.pub_regFreeTrialNote2}</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> {t.pub_regFreeTrialNote3}</div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      {t.pub_regAgreement}{" "}
                      <Link href="/terms-of-service" className="text-indigo-600 hover:underline">{t.pub_regTermsLink}</Link>
                      {" "}{t.pub_regAnd}{" "}
                      <Link href="/privacy-policy" className="text-indigo-600 hover:underline">{t.pub_regPrivacyLink}</Link>
                    </p>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={loading} data-testid="button-reg-back-3">
                        {isRTL ? <ChevronRight className="h-4 w-4 ml-1" /> : <ChevronLeft className="h-4 w-4 mr-1" />}
                        {t.pub_regBack}
                      </Button>
                      <Button
                        className="flex-1 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        onClick={handleSubmit}
                        disabled={loading}
                        data-testid="button-reg-submit"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {loading ? t.pub_regSubmitting : t.pub_regSubmit}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
