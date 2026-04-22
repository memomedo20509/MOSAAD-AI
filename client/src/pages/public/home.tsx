import { useRef, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import {
  Bot, Inbox, Users, BarChart3, BookOpen, Megaphone,
  ChevronRight, Star, CheckCircle2, ArrowLeft, Zap, Shield, Clock,
  MessageSquare, TrendingUp, Globe
} from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";
import { WAChatMockup, CRMPipelineMockup, UnifiedInboxMockup, FloatingBadge, GradientText } from "@/components/public-mockups";
import { AnimateIn } from "@/components/animate-in";
import { useLanguage } from "@/lib/i18n";

/* ===== Count-up component for stat numbers ===== */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function CountUp({
  target,
  suffix = "",
  prefix = "",
  duration = 1400,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

type PlanDisplayItem = {
  id: string;
  name: string;
  price: string;
  desc: string;
  popular: boolean;
  features: string[];
};

function PricingPreview() {
  const { t, language } = useLanguage();

  const FALLBACK_DISPLAY_PLANS: PlanDisplayItem[] = [
    { id: "starter", name: language === "ar" ? "أساسي" : "Starter", price: "49", desc: language === "ar" ? "للشركات الناشئة" : "For startups", popular: false, features: language === "ar" ? ["5 مستخدمين", "200 ليد/شهر", "بوت AI", "دعم واتساب"] : ["5 users", "200 leads/mo", "AI bot", "WhatsApp support"] },
    { id: "pro", name: language === "ar" ? "محترف" : "Professional", price: "149", desc: language === "ar" ? "للفرق المتنامية" : "For growing teams", popular: true, features: language === "ar" ? ["20 مستخدم", "1000 ليد/شهر", "بوت AI متقدم", "حملات واتساب", "تحليلات"] : ["20 users", "1,000 leads/mo", "Advanced AI bot", "WhatsApp campaigns", "Analytics"] },
    { id: "enterprise", name: language === "ar" ? "مؤسسي" : "Enterprise", price: "399", desc: language === "ar" ? "للمؤسسات الكبيرة" : "For large enterprises", popular: false, features: language === "ar" ? ["غير محدود", "ليدز غير محدودة", "API كامل", "دعم أولوية", "تقارير مخصصة"] : ["Unlimited", "Unlimited leads", "Full API", "Priority support", "Custom reports"] },
  ];

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const displayPlans: PlanDisplayItem[] = plans && plans.length > 0
    ? plans.slice(0, 3).map((plan, i) => ({
        id: plan.id,
        name: language === "ar" ? plan.nameAr : plan.name,
        price: String(plan.priceMonthly),
        desc: plan.description || "",
        popular: i === 1,
        features: [],
      }))
    : FALLBACK_DISPLAY_PLANS;

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateIn direction="up" className="text-center mb-14">
          <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">{t.pub_pricingBadge}</Badge>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">{t.pub_pricingTitle}</h2>
          <p className="text-lg text-gray-600">{t.pub_pricingSubtitle}</p>
        </AnimateIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {displayPlans.map((plan, i) => (
            <AnimateIn key={plan.id} direction="up" delay={i * 100}>
              <div
                className={`relative rounded-2xl p-6 flex flex-col h-full ${
                  plan.popular
                    ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/30 scale-105"
                    : "bg-white border border-gray-200 shadow-sm"
                }`}
                data-testid={`card-pricing-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-1/2 translate-x-1/2">
                    <Badge className="bg-yellow-400 text-yellow-900 border-0 px-4 font-bold shadow-md">⭐ {t.pub_mostPopular}</Badge>
                  </div>
                )}
                <h3 className={`text-lg font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.popular ? "text-indigo-200" : "text-gray-500"}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className={`text-4xl font-extrabold ${plan.popular ? "text-white" : "text-indigo-600"}`}>${plan.price}</span>
                  <span className={`text-sm ${plan.popular ? "text-indigo-200" : "text-gray-400"}`}>{t.pub_perMonth}</span>
                </div>
                {plan.features.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${plan.popular ? "text-indigo-100" : "text-gray-600"}`}>
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.popular ? "text-indigo-300" : "text-green-500"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/register">
                  <Button
                    className={`w-full mt-auto ${plan.popular ? "bg-white text-indigo-700 hover:bg-indigo-50" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                    data-testid={`button-plan-cta-${plan.id}`}
                  >
                    {t.pub_startTrial}
                  </Button>
                </Link>
                <p className={`text-xs text-center mt-3 ${plan.popular ? "text-indigo-300" : "text-gray-400"}`}>14{t.pub_trialNote}</p>
              </div>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn direction="up" delay={300} className="text-center">
          <Link href="/pricing">
            <Button variant="ghost" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              {t.pub_comparePlans}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { t, language, isRTL } = useLanguage();

  const HOW_IT_WORKS = [
    {
      step: t.pub_howItWorksStep1Num,
      icon: Zap,
      title: t.pub_howItWorksStep1Title,
      desc: t.pub_howItWorksStep1Desc,
      color: "from-indigo-500 to-blue-500",
    },
    {
      step: t.pub_howItWorksStep2Num,
      icon: Bot,
      title: t.pub_howItWorksStep2Title,
      desc: t.pub_howItWorksStep2Desc,
      color: "from-purple-500 to-indigo-500",
    },
    {
      step: t.pub_howItWorksStep3Num,
      icon: TrendingUp,
      title: t.pub_howItWorksStep3Title,
      desc: t.pub_howItWorksStep3Desc,
      color: "from-pink-500 to-purple-500",
    },
  ];

  const TESTIMONIALS = language === "ar" ? [
    {
      name: "أحمد السيد",
      role: "مدير مبيعات",
      company: "عقارات القاهرة",
      content: "ارتفعت معدلات تحويل الليدز بنسبة ٦٥٪ في أول شهرين. البوت يرد في ثوانٍ حتى في منتصف الليل!",
      rating: 5,
      initials: "أس",
      color: "from-blue-500 to-indigo-500",
    },
    {
      name: "سارة الأنصاري",
      role: "مؤسسة",
      company: "استشارات سارة",
      content: "وفّرت على فريقي ٤ ساعات يومياً من الردود المتكررة. الآن يركزون فقط على العملاء الجاهزين للشراء.",
      rating: 5,
      initials: "سأ",
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "محمد العمري",
      role: "رئيس تنفيذي",
      company: "مجموعة النيل للتطوير",
      content: "أفضل استثمار قمنا به هذا العام. الـ ROI كان واضحاً من الأسبوع الأول.",
      rating: 5,
      initials: "مع",
      color: "from-teal-500 to-green-500",
    },
  ] : [
    {
      name: "Ahmed El-Sayed",
      role: "Sales Manager",
      company: "Cairo Properties",
      content: "Lead conversion rates jumped 65% in the first two months. The bot replies in seconds even at midnight!",
      rating: 5,
      initials: "AE",
      color: "from-blue-500 to-indigo-500",
    },
    {
      name: "Sarah Ansari",
      role: "Founder",
      company: "Sarah Consulting",
      content: "Saved my team 4 hours a day from repetitive replies. Now they focus only on ready-to-buy customers.",
      rating: 5,
      initials: "SA",
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "Mohamed Al-Omari",
      role: "CEO",
      company: "Nile Development Group",
      content: "Best investment we made this year. The ROI was clear from week one.",
      rating: 5,
      initials: "MO",
      color: "from-teal-500 to-green-500",
    },
  ];

  const FAQS = [
    { q: t.pub_homeFaq1Q, a: t.pub_homeFaq1A },
    { q: t.pub_homeFaq2Q, a: t.pub_homeFaq2A },
    { q: t.pub_homeFaq3Q, a: t.pub_homeFaq3A },
    { q: t.pub_homeFaq4Q, a: t.pub_homeFaq4A },
    { q: t.pub_homeFaq5Q, a: t.pub_homeFaq5A },
    { q: t.pub_homeFaq6Q, a: t.pub_homeFaq6A },
  ];

  const LOGOS = language === "ar"
    ? ["شركة النيل", "مجموعة الخليج", "تك العرب", "رواد الأعمال", "الأفق العقاري", "نبض التقنية"]
    : ["Nile Co.", "Gulf Group", "ArabTech", "Entrepreneurs", "Horizon RE", "TechPulse"];

  const STATS = [
    { value: 500, prefix: "+", suffix: "", label: t.pub_statCompanies, icon: Users },
    { value: 65, prefix: "", suffix: "%", label: t.pub_statConversion, icon: TrendingUp },
    { value: null, raw: "24/7", label: t.pub_statSupport, icon: Clock },
    { value: 4, prefix: "", suffix: t.pub_statSavingSuffix, label: t.pub_statSaving, icon: Zap },
  ];

  return (
    <>
      <title>SalesBot AI - {language === "ar" ? "منصة الذكاء الاصطناعي لإدارة المبيعات والمحادثات" : "AI Platform for Sales & Conversation Management"}</title>

      {/* ====== HERO SECTION ====== */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 h-96 w-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-1/3 h-80 w-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 h-64 w-64 bg-blue-500/15 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "50px 50px" }}>
          </div>
          <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%)" }}>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Badge className="bg-white/10 text-white border-white/20 mb-6 px-4 py-1.5 text-sm backdrop-blur-sm">
                {t.pub_heroBadge}
              </Badge>

              <h1 className="text-5xl lg:text-7xl font-heading font-extrabold text-white leading-tight mb-6 tracking-tight" data-testid="text-hero-headline">
                {t.pub_heroHeadline1}{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {t.pub_heroHeadline2}
                </span>
              </h1>

              <p className="text-xl text-indigo-200 mb-8 leading-relaxed max-w-xl" data-testid="text-hero-desc">
                {t.pub_heroDesc}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/register">
                  <Button size="lg" className="gap-2 text-lg px-8 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white border-0 shadow-xl shadow-indigo-500/30" data-testid="button-hero-cta">
                    {t.pub_heroCta}
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm" data-testid="button-hero-demo">
                    {t.pub_heroDemo}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400" /> {t.pub_heroTrial}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400" /> {t.pub_heroNoCard}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400" /> {t.pub_heroCancel}</span>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative flex items-center justify-center">
              <div className="relative w-full max-w-md mx-auto">
                <FloatingBadge className="-top-4 -right-4 z-10">
                  {t.pub_heroNewLead}
                </FloatingBadge>
                <FloatingBadge className="top-1/3 -left-8 z-10" style={{ animationDelay: "1s", animationDuration: "3.5s" }}>
                  <span className="text-green-600">{t.pub_heroQualified}</span>
                </FloatingBadge>
                <FloatingBadge className="-bottom-4 right-8 z-10" style={{ animationDelay: "2s", animationDuration: "4s" }}>
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600" /> 65% ↑
                </FloatingBadge>

                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-2xl rounded-3xl transform scale-110"></div>

                <div className="relative">
                  <WAChatMockup />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== STATS BAR ====== */}
      <section className="py-14 bg-gradient-to-r from-gray-900 to-gray-950 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <AnimateIn key={i} direction="up" delay={i * 80}>
                <div className="group" data-testid={`stat-${i}`}>
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-500/10 mb-3 mx-auto group-hover:bg-indigo-500/20 transition-colors">
                    <s.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mb-1">
                    {s.value !== null && s.value !== undefined ? (
                      <CountUp target={s.value} prefix={s.prefix} suffix={s.suffix} />
                    ) : (
                      s.raw
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-16">
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 mb-4 px-4 py-1">{t.pub_featuresBadge}</Badge>
            <h2 className="text-4xl font-display font-bold text-white mb-4">{t.pub_featuresTitle}</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t.pub_featuresSubtitle}
            </p>
          </AnimateIn>

          {/* Feature 1: AI Chatbot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24" data-testid="feature-block-chatbot">
            <AnimateIn direction="right" className="lg:order-1">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 mb-6 shadow-lg shadow-green-500/30">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">{t.pub_feature1Title}</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">{t.pub_feature1Desc}</p>
              <ul className="space-y-3">
                {[t.pub_feature1Point1, t.pub_feature1Point2, t.pub_feature1Point3, t.pub_feature1Point4].map(f => (
                  <li key={f} className="flex items-center gap-3 text-gray-300">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </AnimateIn>
            <AnimateIn direction="left" delay={120} className="lg:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-teal-500/20 blur-2xl rounded-3xl transform scale-110"></div>
                <div className="relative">
                  <WAChatMockup />
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Feature 2: Unified Inbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24" data-testid="feature-block-inbox">
            <AnimateIn direction="right" className="lg:order-2">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mb-6 shadow-lg shadow-indigo-500/30">
                <Inbox className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">{t.pub_feature2Title}</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">{t.pub_feature2Desc}</p>
              <ul className="space-y-3">
                {[t.pub_feature2Point1, t.pub_feature2Point2, t.pub_feature2Point3, t.pub_feature2Point4].map(f => (
                  <li key={f} className="flex items-center gap-3 text-gray-300">
                    <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-indigo-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </AnimateIn>
            <AnimateIn direction="left" delay={120} className="lg:order-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-2xl rounded-3xl transform scale-110"></div>
                <div className="relative">
                  <UnifiedInboxMockup />
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Feature 3: CRM Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center" data-testid="feature-block-crm">
            <AnimateIn direction="right" className="lg:order-1">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 mb-6 shadow-lg shadow-orange-500/30">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">{t.pub_feature3Title}</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">{t.pub_feature3Desc}</p>
              <ul className="space-y-3">
                {[t.pub_feature3Point1, t.pub_feature3Point2, t.pub_feature3Point3, t.pub_feature3Point4].map(f => (
                  <li key={f} className="flex items-center gap-3 text-gray-300">
                    <div className="h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-orange-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </AnimateIn>
            <AnimateIn direction="left" delay={120} className="lg:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-pink-500/20 blur-2xl rounded-3xl transform scale-110"></div>
                <div className="relative">
                  <CRMPipelineMockup />
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-16">
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">{t.pub_howItWorksBadge}</Badge>
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">{t.pub_howItWorksTitle}</h2>
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <AnimateIn key={i} direction="up" delay={i * 100}>
                <div className="text-center relative group" data-testid={`step-${i + 1}`}>
                  <div className={`inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} mb-6 shadow-xl mx-auto group-hover:scale-110 transition-transform`}>
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-5xl font-extrabold text-gray-100 mb-3">{step.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 -mt-8">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ====== SOCIAL PROOF - LOGOS + TESTIMONIALS ====== */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-10">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">
              {language === "ar" ? "شركات رائدة تثق بنا" : "Leading companies that trust us"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {LOGOS.map((logo, i) => (
                <AnimateIn key={logo} direction="scale" delay={i * 60}>
                  <div className="bg-white rounded-xl px-6 py-3 shadow-sm border border-gray-100 text-sm font-semibold text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition-colors">
                    {logo}
                  </div>
                </AnimateIn>
              ))}
            </div>
          </AnimateIn>

          <AnimateIn direction="up" className="text-center mb-12 mt-16">
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">{t.pub_testimonialsBadge}</Badge>
            <h2 className="text-4xl font-display font-bold text-gray-900">{t.pub_testimonialsTitle}</h2>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <AnimateIn key={testimonial.name} direction="up" delay={i * 100}>
                <div
                  className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all h-full"
                  data-testid={`testimonial-${i}`}
                >
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                    <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.role} — {testimonial.company}</div>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING PREVIEW ====== */}
      <PricingPreview />

      {/* ====== FAQ ====== */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-12">
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">{t.pub_faqBadge}</Badge>
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">{t.pub_faqTitle}</h2>
          </AnimateIn>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AnimateIn key={i} direction="up" delay={i * 60}>
                <AccordionItem
                  value={`faq-${i}`}
                  className="border border-gray-200 rounded-xl px-5 shadow-sm hover:border-indigo-200 transition-colors"
                  data-testid={`faq-item-${i}`}
                >
                  <AccordionTrigger className="text-right font-medium text-gray-900 hover:text-indigo-600 hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              </AnimateIn>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ====== CTA BANNER ====== */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-800"></div>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }}>
        </div>
        <div className="absolute top-0 right-1/4 h-64 w-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 h-64 w-64 bg-purple-400/20 rounded-full blur-3xl"></div>

        <AnimateIn direction="scale" className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-display font-extrabold text-white mb-5">
            {t.pub_ctaTitle}
          </h2>
          <p className="text-xl text-indigo-200 mb-10 leading-relaxed">
            {t.pub_ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-10 bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl font-bold" data-testid="button-footer-cta">
                {t.pub_ctaButton}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-lg px-10 border-white/40 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm" data-testid="button-footer-contact">
                {t.pub_navContact}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-indigo-300">
            ✓ {t.pub_heroTrial} &nbsp; ✓ {t.pub_heroNoCard} &nbsp; ✓ {t.pub_heroCancel}
          </p>
        </AnimateIn>
      </section>
    </>
  );
}
