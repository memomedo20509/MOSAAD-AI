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
import { Building2, User, CheckCircle2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

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
      // Invalidate auth cache so user appears logged in
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

      <section className="min-h-screen bg-gradient-to-br from-primary/10 to-blue-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-primary mb-6">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              SalesBot AI
            </Link>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-register-headline">
              ابدأ تجربتك المجانية
            </h1>
            <p className="text-gray-600 mt-2">14 يوماً مجاناً — بدون بطاقة ائتمانية</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold transition-colors ${
                  step > i + 1
                    ? "bg-green-500 text-white"
                    : step === i + 1
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-500"
                }`} data-testid={`step-indicator-${i + 1}`}>
                  {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${step === i + 1 ? "text-primary font-medium" : "text-gray-400"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="h-px w-6 bg-gray-300" />}
              </div>
            ))}
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              {/* Step 1: Company info */}
              {step === 1 && (
                <div className="space-y-5" data-testid="register-step-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
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
                  <Button className="w-full gap-2" onClick={handleNext} data-testid="button-reg-next-1">
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Step 2: Owner info */}
              {step === 2 && (
                <div className="space-y-4" data-testid="register-step-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
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
                    <Button className="flex-1 gap-1" onClick={handleNext} data-testid="button-reg-next-2">
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
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h2 className="font-bold text-gray-900 text-xl">تأكيد التسجيل</h2>
                    <p className="text-gray-600 text-sm">راجع بياناتك قبل إنشاء الحساب</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
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

                  <div className="bg-primary/5 rounded-lg p-4 text-sm text-gray-700">
                    ✓ ستحصل على تجربة مجانية 14 يوماً<br />
                    ✓ لا بطاقة ائتمانية مطلوبة<br />
                    ✓ يمكن الإلغاء في أي وقت
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    بالتسجيل، أنت توافق على{" "}
                    <Link href="/terms-of-service" className="text-primary hover:underline">شروط الاستخدام</Link>
                    {" "}و{" "}
                    <Link href="/privacy-policy" className="text-primary hover:underline">سياسة الخصوصية</Link>
                  </p>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={loading} data-testid="button-reg-back-3">
                      <ChevronRight className="h-4 w-4 ml-1" />
                      السابق
                    </Button>
                    <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={loading} data-testid="button-reg-submit">
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      إنشاء الحساب
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-600 mt-4">
            لديك حساب بالفعل؟{" "}
            <Link href="/auth" className="text-primary hover:underline font-medium">تسجيل الدخول</Link>
          </p>
        </div>
      </section>
    </>
  );
}
