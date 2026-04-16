import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2,
  Users,
  BookOpen,
  MessageSquare,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Loader2,
  PartyPopper,
  QrCode,
  UserPlus,
} from "lucide-react";

const TOTAL_STEPS = 5;

const INDUSTRIES = [
  "عقارات",
  "سيارات",
  "تأمين",
  "تعليم",
  "رعاية صحية",
  "تقنية",
  "تجزئة",
  "ضيافة",
  "مالية",
  "أخرى",
];

const TIMEZONES = [
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Africa/Casablanca", label: "الدار البيضاء (GMT+1)" },
  { value: "Africa/Tunis", label: "تونس (GMT+1)" },
  { value: "UTC", label: "UTC (GMT+0)" },
];

type OnboardingStatus = {
  onboardingStep: number;
  hasCompletedOnboarding: boolean;
  hasSeenTour: boolean;
  company: { name: string; industry: string | null; logoUrl: string | null; workingHours: string | null; timezone: string | null } | null;
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current - 1) / total) * 100);
  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">الخطوة {current} من {total}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function StepCard({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Step1({ data, onChange }: {
  data: { name: string; industry: string; workingHours: string; timezone: string };
  onChange: (d: Partial<typeof data>) => void;
}) {
  return (
    <StepCard icon={Building2} title="ملف الشركة">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">اسم الشركة *</Label>
          <Input
            id="company-name"
            value={data.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="شركة المتميزون العقارية"
            data-testid="input-company-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">المجال</Label>
          <Select value={data.industry} onValueChange={v => onChange({ industry: v })}>
            <SelectTrigger id="industry" data-testid="select-industry">
              <SelectValue placeholder="اختر مجال الشركة" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(i => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="working-hours">ساعات العمل</Label>
          <Input
            id="working-hours"
            value={data.workingHours}
            onChange={e => onChange({ workingHours: e.target.value })}
            placeholder="مثال: 9 ص – 5 م"
            data-testid="input-working-hours"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">المنطقة الزمنية</Label>
          <Select value={data.timezone} onValueChange={v => onChange({ timezone: v })}>
            <SelectTrigger id="timezone" data-testid="select-timezone">
              <SelectValue placeholder="اختر المنطقة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </StepCard>
  );
}

function Step2({ members, onAdd, onRemove, onUpdate }: {
  members: { name: string; email: string; role: string }[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: string, value: string) => void;
}) {
  return (
    <StepCard icon={Users} title="إضافة أعضاء الفريق">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          أضف أعضاء فريق المبيعات. يمكنك إضافة المزيد لاحقاً من صفحة المستخدمين.
        </p>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={i} className="flex gap-2 items-start border rounded-lg p-3 bg-muted/30">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="الاسم"
                  value={m.name}
                  onChange={e => onUpdate(i, "name", e.target.value)}
                  data-testid={`input-member-name-${i}`}
                />
                <Input
                  placeholder="البريد الإلكتروني"
                  value={m.email}
                  onChange={e => onUpdate(i, "email", e.target.value)}
                  data-testid={`input-member-email-${i}`}
                />
                <Select value={m.role} onValueChange={v => onUpdate(i, "role", v)}>
                  <SelectTrigger data-testid={`select-member-role-${i}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_agent">سيلز</SelectItem>
                    <SelectItem value="team_leader">تيم ليدر</SelectItem>
                    <SelectItem value="sales_admin">سيلز أدمن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(i)} data-testid={`button-remove-member-${i}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={onAdd} className="w-full gap-2" data-testid="button-add-member">
          <Plus className="h-4 w-4" />
          إضافة عضو
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          ملاحظة: سيتم إنشاء الحسابات بكلمة مرور مؤقتة ويمكن تعديلها لاحقاً.
        </p>
      </div>
    </StepCard>
  );
}

function Step3({ items, onAdd, onRemove, onUpdate }: {
  items: { name: string; description: string; category: string }[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: string, value: string) => void;
}) {
  return (
    <StepCard icon={BookOpen} title="إعداد قاعدة المعرفة">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          أضف منتجاتك أو خدماتك الأساسية. البوت الذكي سيستخدم هذه المعلومات للرد على استفسارات العملاء.
        </p>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start border rounded-lg p-3 bg-muted/30">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="اسم المنتج / الخدمة"
                  value={item.name}
                  onChange={e => onUpdate(i, "name", e.target.value)}
                  data-testid={`input-kb-name-${i}`}
                />
                <Textarea
                  placeholder="وصف مختصر (السعر، المميزات، ...)"
                  value={item.description}
                  onChange={e => onUpdate(i, "description", e.target.value)}
                  rows={2}
                  data-testid={`input-kb-description-${i}`}
                />
                <Input
                  placeholder="التصنيف (مثال: شقق، فيلات، ...)"
                  value={item.category}
                  onChange={e => onUpdate(i, "category", e.target.value)}
                  data-testid={`input-kb-category-${i}`}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(i)} data-testid={`button-remove-kb-${i}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={onAdd} className="w-full gap-2" data-testid="button-add-kb-item">
          <Plus className="h-4 w-4" />
          إضافة منتج / خدمة
        </Button>
      </div>
    </StepCard>
  );
}

function Step4({ onSkip }: { onSkip: () => void }) {
  return (
    <StepCard icon={MessageSquare} title="ربط واتساب">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          اربط واتساب بيزنس لتفعيل الرد التلقائي وإرسال الرسائل مباشرة من المنصة.
        </p>
        <div className="flex flex-col items-center gap-4 py-6 border rounded-lg bg-muted/20">
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
            <QrCode className="h-12 w-12 text-primary/40" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium">QR Code واتساب</p>
            <p className="text-sm text-muted-foreground">
              اذهب إلى <strong>التكاملات</strong> بعد إتمام الإعداد لربط واتساب بيزنس API
            </p>
          </div>
        </div>
        <div className="text-center">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground text-sm" data-testid="button-skip-whatsapp">
            تخطي هذه الخطوة في الوقت الحالي
          </Button>
        </div>
      </div>
    </StepCard>
  );
}

function Step5({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center" dir="rtl">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">🎉 أهلاً بك في SalesBot AI!</h2>
        <p className="text-muted-foreground max-w-md">
          تم إعداد حسابك بنجاح. أنت الآن جاهز لتحقيق أقصى استفادة من المنصة.
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-sm">
        <h3 className="font-medium text-sm text-muted-foreground">ابدأ بـ:</h3>
        <a
          href="/leads?action=add"
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-right"
          data-testid="link-add-first-lead"
        >
          <UserPlus className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">أضف أول ليد</p>
            <p className="text-xs text-muted-foreground">ابدأ ببناء قاعدة بيانات عملائك</p>
          </div>
        </a>
        <a
          href="/chatbot-config"
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-right"
          data-testid="link-configure-chatbot"
        >
          <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">اضبط البوت الذكي</p>
            <p className="text-xs text-muted-foreground">خصص ردود وشخصية البوت</p>
          </div>
        </a>
        <a
          href="/leads/upload"
          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors text-right"
          data-testid="link-import-leads"
        >
          <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">استورد الليدز</p>
            <p className="text-xs text-muted-foreground">رفع ملف Excel بقائمة عملائك</p>
          </div>
        </a>
      </div>
      <Button onClick={onGoToDashboard} size="lg" className="w-full max-w-sm gap-2" data-testid="button-go-to-dashboard">
        <CheckCircle className="h-5 w-5" />
        الذهاب للوحة التحكم
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: status } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
  });

  const [currentStep, setCurrentStep] = useState(() => {
    return Math.min(Math.max((status?.onboardingStep ?? 0) + 1, 1), TOTAL_STEPS);
  });

  const [companyData, setCompanyData] = useState({
    name: status?.company?.name ?? user?.firstName ?? "",
    industry: status?.company?.industry ?? "",
    workingHours: status?.company?.workingHours ?? "",
    timezone: status?.company?.timezone ?? "Africa/Cairo",
  });

  const [members, setMembers] = useState<{ name: string; email: string; role: string }[]>([]);
  const [kbItems, setKbItems] = useState<{ name: string; description: string; category: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const saveStepMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/onboarding/step", body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
    },
  });

  const createMembersMutation = useMutation({
    mutationFn: async (members: { name: string; email: string; role: string }[]) => {
      const results = [];
      for (const m of members) {
        if (!m.name || !m.email) continue;
        try {
          const username = m.email.split("@")[0].replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_" + Date.now().toString(36).slice(-4);
          const res = await apiRequest("POST", "/api/users", {
            username,
            password: "TempPass123!",
            email: m.email,
            firstName: m.name,
            role: m.role,
          });
          results.push(await res.json());
        } catch (_) {}
      }
      return results;
    },
  });

  const createKbMutation = useMutation({
    mutationFn: async (items: { name: string; description: string; category: string }[]) => {
      const results = [];
      for (const item of items) {
        if (!item.name) continue;
        try {
          const res = await apiRequest("POST", "/api/knowledge-base", {
            name: item.name,
            description: item.description || null,
            category: item.category || null,
            isActive: true,
          });
          results.push(await res.json());
        } catch (_) {}
      }
      return results;
    },
  });

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await saveStepMutation.mutateAsync({ step: currentStep, completed: true });
      navigate("/");
    } catch (_) {
      navigate("/");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    setIsSaving(true);
    try {
      if (currentStep === 1) {
        if (!companyData.name.trim()) {
          toast({ title: "اسم الشركة مطلوب", variant: "destructive" });
          setIsSaving(false);
          return;
        }
        await saveStepMutation.mutateAsync({ step: 1, companyData });
      } else if (currentStep === 2) {
        if (members.length > 0) {
          await createMembersMutation.mutateAsync(members);
        }
        await saveStepMutation.mutateAsync({ step: 2 });
      } else if (currentStep === 3) {
        if (kbItems.length > 0) {
          await createKbMutation.mutateAsync(kbItems);
        }
        await saveStepMutation.mutateAsync({ step: 3 });
      } else if (currentStep === 4) {
        await saveStepMutation.mutateAsync({ step: 4 });
      }
      setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
    } catch (err) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(s => Math.max(s - 1, 1));
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await saveStepMutation.mutateAsync({ step: 5, completed: true });
      qc.invalidateQueries({ queryKey: ["/api/user"] });
      navigate("/");
    } catch (_) {
      navigate("/");
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-lg font-semibold" dir="rtl">إعداد حسابك</CardTitle>
              {currentStep < TOTAL_STEPS && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="text-muted-foreground text-xs"
                  data-testid="button-skip-setup"
                >
                  تخطي الإعداد
                </Button>
              )}
            </div>
            {currentStep < TOTAL_STEPS && (
              <StepIndicator current={currentStep} total={TOTAL_STEPS - 1} />
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <Step1
                data={companyData}
                onChange={d => setCompanyData(prev => ({ ...prev, ...d }))}
              />
            )}
            {currentStep === 2 && (
              <Step2
                members={members}
                onAdd={() => setMembers(prev => [...prev, { name: "", email: "", role: "sales_agent" }])}
                onRemove={i => setMembers(prev => prev.filter((_, idx) => idx !== i))}
                onUpdate={(i, field, value) => setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))}
              />
            )}
            {currentStep === 3 && (
              <Step3
                items={kbItems}
                onAdd={() => setKbItems(prev => [...prev, { name: "", description: "", category: "" }])}
                onRemove={i => setKbItems(prev => prev.filter((_, idx) => idx !== i))}
                onUpdate={(i, field, value) => setKbItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))}
              />
            )}
            {currentStep === 4 && (
              <Step4 onSkip={handleNext} />
            )}
            {currentStep === 5 && (
              <Step5 onGoToDashboard={handleComplete} />
            )}

            {currentStep < TOTAL_STEPS && (
              <div className="flex items-center justify-between pt-2" dir="rtl">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isSaving}
                  className="gap-2"
                  data-testid="button-step-back"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="gap-2"
                  data-testid="button-step-next"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      التالي
                      <ChevronLeft className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 mt-4" dir="rtl">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i + 1 === currentStep
                  ? "w-6 bg-primary"
                  : i + 1 < currentStep
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
