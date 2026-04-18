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
import { WAChatMockup } from "@/components/public-mockups";

const INDUSTRIES = [
  "عقارات", "تجزئة وتجارة إلكترونية", "تعليم", "صحة وطب",
  "سيارات", "سفر وسياحة", "خدمات مالية", "تقنية", "أغذية ومطاعم", "أخرى"
];

const SIZES = [
  { value: "1-5", label: "1-5 موظفين" },
  { value: "6-20", label: "6-20 موظفاً" },
  { value: "21-50", label: "21-50 موظفاً" },
  { value: "51-200", label: "51-200 موظفاً" },
  { value: "200+", label: "أكثر من 200 موظف" },
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

const STEPS = ["معلومات الشركة", "معلومات المالك", "التأكيد"];

const BENEFITS = [
  { icon: Zap, title: "إعداد في 30 دقيقة", desc: "ابدأ فوراً بدون خبرة تقنية" },
  { icon: Shield, title: "14 يوماً مجاناً", desc: "بدون بطاقة ائتمانية" },
  { icon: Clock, title: "رد فوري 24/7", desc: "البوت يعمل بينما أنت نائم" },
];

const ONBOARDING_STEPS = [
  {
    icon: Smartphone,
    number: "١",
    title: "ربط واتساب",
    desc: "وصّل رقمك في دقيقة واحدة عبر رمز QR",
    color: "from-indigo-500 to-indigo-400",
  },
  {
    icon: SlidersHorizontal,
    number: "٢",
    title: "ضبط البوت",
    desc: "خصّص الردود والسيناريوهات لتناسب عملك",
    color: "from-purple-500 to-purple-400",
  },
  {
    icon: Rocket,
    number: "٣",
    title: "ابدأ تحويل العملاء",
    desc: "البوت يتولى المتابعة وإغلاق الصفقات تلقائياً",
    color: "from-pink-500 to-purple-500",
  },
];

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
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

  const update = (key: keyof FormData, value: string) => setForm(f => ({ ...f, [key]: value }));

  const validateStep1 = () => {
    if (!form.companyName.trim()) {
      toast({ title: "خطأ", description: "اسم الشركة مطلوب", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.ownerName.trim()) {
      toast({ title: "خطأ", description: "اسم المالك مطلوب", variant: "destructive" });
      return false;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      toast({ title: "خطأ", description: "بريد إلكتروني صحيح مطلوب", variant: "destructive" });
      return false;
    }
    if (!form.username.trim() || form.username.length < 3) {
      toast({ title: "خطأ", description: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل", variant: "destructive" });
      return false;
    }
    if (form.password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
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
      toast({ title: "تم التسجيل بنجاح!", description: "جاري توجيهك..." });
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      const msg = err.message || "حدث خطأ أثناء التسجيل";
      toast({ title: "خطأ في التسجيل", description: msg, variant: "destructive" });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>إنشاء حساب - SalesBot AI</title>
      <meta name="description" content="سجّل شركتك في SalesBot AI وابدأ تجربتك المجانية لمدة 14 يوماً." />

      <section className="min-h-screen pt-16 grid lg:grid-cols-2">
        {/* Left column — dark gradient brand side */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 px-12 py-16 overflow-hidden">
          {/* Background glow orbs */}
          <div className="absolute top-1/4 right-1/4 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 h-48 w-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top: headline & benefits */}
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold text-white leading-snug mb-3">
              حوّل محادثاتك إلى{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                صفقات مغلقة
              </span>
            </h2>
            <p className="text-indigo-200 text-base mb-10 leading-relaxed">
              انضم إلى آلاف الشركات التي تستخدم SalesBot AI لأتمتة مبيعاتها عبر واتساب.
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

            {/* What happens after signup — 3-step visual flow */}
            <div className="mt-10">
              <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-4">
                ماذا يحدث بعد التسجيل؟
              </p>
              <div className="space-y-3" data-testid="onboarding-flow">
                {ONBOARDING_STEPS.map(({ icon: Icon, number, title, desc, color }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {/* Left: icon + connector line */}
                    <div className="flex flex-col items-center">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-lg`} data-testid={`onboarding-step-icon-${i + 1}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {i < ONBOARDING_STEPS.length - 1 && (
                        <div className="w-px h-5 bg-white/15 mt-1" />
                      )}
                    </div>
                    {/* Right: text */}
                    <div className="pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-400 text-xs font-bold">{number}.</span>
                        <span className="text-white font-semibold text-sm" data-testid={`onboarding-step-title-${i + 1}`}>{title}</span>
                      </div>
                      <p className="text-indigo-300 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                    {/* Arrow connector between steps (horizontal, hidden on small) */}
                  </div>
                ))}
              </div>
            </div>

            {/* Social proof strip */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {["أس", "سأ", "مع", "نز"].map((initials, i) => (
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
                <span className="text-white font-semibold">+2,400 شركة</span> تثق بنا
              </div>
            </div>
          </div>

          {/* Bottom: WA chat mockup */}
          <div className="relative z-10 mt-10">
            <WAChatMockup />
          </div>
        </div>

        {/* Right column — form */}
        <div className="flex flex-col justify-center items-center px-6 py-12 bg-gray-50 dark:bg-gray-950">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-register-headline">
                ابدأ تجربتك المجانية
              </h1>
              <p className="text-gray-500 mt-1 text-sm">14 يوماً مجاناً — بدون بطاقة ائتمانية</p>
            </div>

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
                      <h2 className="font-bold text-gray-900">معلومات الشركة</h2>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-company">اسم الشركة *</Label>
                      <Input
                        id="reg-company"
                        value={form.companyName}
                        onChange={e => update("companyName", e.target.value)}
                        placeholder="مثال: شركة النجاح للعقارات"
                        data-testid="input-reg-company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>القطاع</Label>
                      <Select value={form.industry} onValueChange={v => update("industry", v)}>
                        <SelectTrigger data-testid="select-reg-industry">
                          <SelectValue placeholder="اختر القطاع..." />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(ind => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>حجم الشركة</Label>
                      <Select value={form.size} onValueChange={v => update("size", v)}>
                        <SelectTrigger data-testid="select-reg-size">
                          <SelectValue placeholder="اختر حجم الشركة..." />
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
                      التالي
                      <ChevronLeft className="h-4 w-4" />
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
                      <h2 className="font-bold text-gray-900">معلومات المالك</h2>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-owner">الاسم الكامل *</Label>
                      <Input
                        id="reg-owner"
                        value={form.ownerName}
                        onChange={e => update("ownerName", e.target.value)}
                        placeholder="الاسم الأول والأخير"
                        data-testid="input-reg-owner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">البريد الإلكتروني *</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        value={form.email}
                        onChange={e => update("email", e.target.value)}
                        placeholder="example@company.com"
                        data-testid="input-reg-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">رقم الهاتف</Label>
                      <Input
                        id="reg-phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => update("phone", e.target.value)}
                        placeholder="+966 5XX XXX XXXX"
                        data-testid="input-reg-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">اسم المستخدم *</Label>
                      <Input
                        id="reg-username"
                        value={form.username}
                        onChange={e => update("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                        placeholder="username"
                        dir="ltr"
                        data-testid="input-reg-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">كلمة المرور *</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        value={form.password}
                        onChange={e => update("password", e.target.value)}
                        placeholder="6 أحرف على الأقل"
                        data-testid="input-reg-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">تأكيد كلمة المرور *</Label>
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
                        <ChevronRight className="h-4 w-4 ml-1" />
                        السابق
                      </Button>
                      <Button
                        className="flex-1 gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        onClick={handleNext}
                        data-testid="button-reg-next-2"
                      >
                        التالي
                        <ChevronLeft className="h-4 w-4" />
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
                      <h2 className="font-bold text-gray-900 text-xl">تأكيد التسجيل</h2>
                      <p className="text-gray-500 text-sm">راجع بياناتك قبل إنشاء الحساب</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm border border-gray-100">
                      <div className="flex justify-between">
                        <span className="text-gray-500">اسم الشركة</span>
                        <span className="font-medium text-gray-900" data-testid="summary-company">{form.companyName}</span>
                      </div>
                      {form.industry && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">القطاع</span>
                          <span className="font-medium text-gray-900">{form.industry}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">الاسم</span>
                        <span className="font-medium text-gray-900" data-testid="summary-owner">{form.ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">البريد الإلكتروني</span>
                        <span className="font-medium text-gray-900" data-testid="summary-email">{form.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">اسم المستخدم</span>
                        <span className="font-medium text-gray-900" dir="ltr">{form.username}</span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800 border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> ستحصل على تجربة مجانية 14 يوماً</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> لا بطاقة ائتمانية مطلوبة</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" /> يمكن الإلغاء في أي وقت</div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                      بالتسجيل، أنت توافق على{" "}
                      <Link href="/terms-of-service" className="text-indigo-600 hover:underline">شروط الاستخدام</Link>
                      {" "}و{" "}
                      <Link href="/privacy-policy" className="text-indigo-600 hover:underline">سياسة الخصوصية</Link>
                    </p>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={loading} data-testid="button-reg-back-3">
                        <ChevronRight className="h-4 w-4 ml-1" />
                        السابق
                      </Button>
                      <Button
                        className="flex-1 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        onClick={handleSubmit}
                        disabled={loading}
                        data-testid="button-reg-submit"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        إنشاء الحساب
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-sm text-gray-500 mt-5">
              لديك حساب بالفعل؟{" "}
              <Link href="/auth" className="text-indigo-600 hover:underline font-medium">تسجيل الدخول</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
