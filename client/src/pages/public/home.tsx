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

/* ===== Scroll animation hook ===== */
function useInView(threshold = 0.12, rootMargin = "0px 0px -48px 0px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}

type AnimateDirection = "up" | "left" | "right" | "fade" | "scale";

function AnimateIn({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: AnimateDirection;
}) {
  const { ref, inView } = useInView();
  const dirClass = {
    up: "animate-scroll-up",
    left: "animate-scroll-left",
    right: "animate-scroll-right",
    fade: "animate-scroll-fade",
    scale: "animate-scroll-scale",
  }[direction];

  return (
    <div
      ref={ref}
      className={`${dirClass} ${inView ? "in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

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

const HOW_IT_WORKS = [
  {
    step: "١",
    icon: Zap,
    title: "سجّل وأعدّ البوت",
    desc: "أنشئ حسابك في دقائق، وصل قنواتك، وأدخل معلومات منتجاتك.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    step: "٢",
    icon: Bot,
    title: "البوت يستقبل ويؤهّل",
    desc: "الذكاء الاصطناعي يرد تلقائياً على العملاء ويجمع بياناتهم ويرشدهم.",
    color: "from-purple-500 to-indigo-500",
  },
  {
    step: "٣",
    icon: TrendingUp,
    title: "فريقك يُغلق الصفقات",
    desc: "يصلك الليد مؤهلاً جاهزاً للتحويل في CRM متكامل مع كل تاريخه.",
    color: "from-pink-500 to-purple-500",
  },
];

const TESTIMONIALS = [
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
];

const FAQS = [
  {
    q: "هل يعمل البوت مع واتساب الشخصي والأعمال؟",
    a: "نعم، يعمل مع واتساب بيزنس API وواتساب العادي. ويدعم أيضاً فيسبوك ماسنجر وانستغرام DM.",
  },
  {
    q: "كم يستغرق الإعداد؟",
    a: "تستطيع إعداد البوت وتشغيله خلال 30 دقيقة فقط. لا تحتاج لخبرة تقنية.",
  },
  {
    q: "هل البيانات آمنة؟",
    a: "بالكامل. البيانات مشفرة ومعزولة لكل شركة. نحن نلتزم بأعلى معايير الأمان.",
  },
  {
    q: "هل يمكنني إلغاء الاشتراك في أي وقت؟",
    a: "نعم، الإلغاء سهل وفوري في أي وقت دون رسوم إضافية.",
  },
  {
    q: "كيف يتعلم البوت على منتجاتي؟",
    a: "تضيف معلومات منتجاتك وخدماتك في قاعدة المعرفة، والبوت يستخدمها للرد بدقة.",
  },
  {
    q: "هل هناك نسخة تجريبية مجانية؟",
    a: "نعم! جميع الخطط تأتي مع تجربة مجانية 14 يوماً بدون بطاقة ائتمانية.",
  },
];

const LOGOS = ["شركة النيل", "مجموعة الخليج", "تك العرب", "رواد الأعمال", "الأفق العقاري", "نبض التقنية"];

type PlanDisplayItem = {
  id: string;
  name: string;
  price: string;
  desc: string;
  popular: boolean;
  features: string[];
};

const FALLBACK_DISPLAY_PLANS: PlanDisplayItem[] = [
  { id: "starter", name: "أساسي", price: "49", desc: "للشركات الناشئة", popular: false, features: ["5 مستخدمين", "200 ليد/شهر", "بوت AI", "دعم واتساب"] },
  { id: "pro", name: "محترف", price: "149", desc: "للفرق المتنامية", popular: true, features: ["20 مستخدم", "1000 ليد/شهر", "بوت AI متقدم", "حملات واتساب", "تحليلات"] },
  { id: "enterprise", name: "مؤسسي", price: "399", desc: "للمؤسسات الكبيرة", popular: false, features: ["غير محدود", "ليدز غير محدودة", "API كامل", "دعم أولوية", "تقارير مخصصة"] },
];

function PricingPreview() {
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const displayPlans: PlanDisplayItem[] = plans && plans.length > 0
    ? plans.slice(0, 3).map((plan, i) => ({
        id: plan.id,
        name: plan.nameAr,
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
          <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">الأسعار</Badge>
          <h2 className="text-4xl font-heading font-bold text-gray-900 mb-4">أسعار واضحة وبسيطة</h2>
          <p className="text-lg text-gray-600">ابدأ مجاناً، وسّع عندما تنمو</p>
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
                    <Badge className="bg-yellow-400 text-yellow-900 border-0 px-4 font-bold shadow-md">⭐ الأكثر شعبية</Badge>
                  </div>
                )}
                <h3 className={`text-lg font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.popular ? "text-indigo-200" : "text-gray-500"}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className={`text-4xl font-extrabold ${plan.popular ? "text-white" : "text-indigo-600"}`}>${plan.price}</span>
                  <span className={`text-sm ${plan.popular ? "text-indigo-200" : "text-gray-400"}`}>/شهر</span>
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
                    ابدأ مجاناً
                  </Button>
                </Link>
                <p className={`text-xs text-center mt-3 ${plan.popular ? "text-indigo-300" : "text-gray-400"}`}>14 يوم مجاناً — بدون بطاقة</p>
              </div>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn direction="up" delay={300} className="text-center">
          <Link href="/pricing">
            <Button variant="ghost" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              مقارنة تفصيلية للخطط
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <title>SalesBot AI - منصة الذكاء الاصطناعي لإدارة المبيعات والمحادثات</title>

      {/* ====== HERO SECTION — no scroll animation, it's the first thing visible ====== */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950">
        {/* Mesh/glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 h-96 w-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-1/3 h-80 w-80 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 h-64 w-64 bg-blue-500/15 rounded-full blur-3xl"></div>
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "50px 50px" }}>
          </div>
          {/* Top scrim for navbar readability */}
          <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)" }}>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text column (right in RTL) */}
            <div className="order-2 lg:order-1">
              <Badge className="bg-white/10 text-white border-white/20 mb-6 px-4 py-1.5 text-sm backdrop-blur-sm">
                🚀 الجيل القادم من CRM للمبيعات العربية
              </Badge>

              <h1 className="text-5xl lg:text-7xl font-heading font-extrabold text-white leading-tight mb-6 tracking-tight" data-testid="text-hero-headline">
                حوّل كل محادثة إلى{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  صفقة ناجحة
                </span>
              </h1>

              <p className="text-xl text-indigo-200 mb-8 leading-relaxed max-w-xl" data-testid="text-hero-desc">
                بوت ذكي يدير محادثاتك ويؤهّل عملاءك تلقائياً، مع CRM متكامل يحوّلهم إلى صفقات حقيقية. وفّر وقت فريقك وضاعف مبيعاتك.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/register">
                  <Button size="lg" className="gap-2 text-lg px-8 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white border-0 shadow-xl shadow-indigo-500/30" data-testid="button-hero-cta">
                    ابدأ تجربتك المجانية
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm" data-testid="button-hero-demo">
                    طلب عرض تجريبي
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400" /> 14 يوم مجاناً</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400" /> بدون بطاقة ائتمانية</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-400" /> إلغاء في أي وقت</span>
              </div>
            </div>

            {/* Mockup column (left in RTL) */}
            <div className="order-1 lg:order-2 relative flex items-center justify-center">
              <div className="relative w-full max-w-md mx-auto">
                {/* Floating badges */}
                <FloatingBadge className="-top-4 -right-4 z-10">
                  🔥 ليد جديد واصل!
                </FloatingBadge>
                <FloatingBadge className="top-1/3 -left-8 z-10" style={{ animationDelay: "1s", animationDuration: "3.5s" }}>
                  <span className="text-green-600">✓</span> تم التأهيل
                </FloatingBadge>
                <FloatingBadge className="-bottom-4 right-8 z-10" style={{ animationDelay: "2s", animationDuration: "4s" }}>
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600" /> 65% تحويل ↑
                </FloatingBadge>

                {/* Glow behind mockup */}
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
            {[
              { value: 500, prefix: "+", suffix: "", label: "شركة تثق بنا", icon: Users },
              { value: 65, prefix: "", suffix: "%", label: "زيادة التحويل", icon: TrendingUp },
              { value: null, raw: "24/7", label: "دعم متواصل", icon: Clock },
              { value: 4, prefix: "", suffix: "", labelSuffix: " ساعات", label: "توفير يومي للفريق", icon: Zap },
            ].map((s, i) => (
              <AnimateIn key={s.label} direction="up" delay={i * 80}>
                <div className="group" data-testid={`stat-${s.label}`}>
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-500/10 mb-3 mx-auto group-hover:bg-indigo-500/20 transition-colors">
                    <s.icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mb-1">
                    {s.value !== null && s.value !== undefined ? (
                      <CountUp target={s.value} prefix={s.prefix} suffix={(s.suffix || "") + (s.labelSuffix || "")} />
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

      {/* ====== FEATURES SECTION - ALTERNATING LAYOUT ====== */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-16">
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 mb-4 px-4 py-1">المميزات</Badge>
            <h2 className="text-4xl font-heading font-bold text-white mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              منصة متكاملة تجمع الذكاء الاصطناعي مع إدارة علاقات العملاء
            </p>
          </AnimateIn>

          {/* Feature 1: AI Chatbot */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24" data-testid="feature-block-chatbot">
            <AnimateIn direction="right" className="lg:order-1">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 mb-6 shadow-lg shadow-green-500/30">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">شات بوت AI متطور</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                بوت ذكي يرد على العملاء 24/7 عبر واتساب وجميع القنوات. يفهم العربية بشكل كامل ويؤهّل الليدز تلقائياً.
              </p>
              <ul className="space-y-3">
                {["رد فوري في ثوانٍ على كل استفسار", "تأهيل الليدز وتصنيفهم تلقائياً", "يتعلم من قاعدة معرفة منتجاتك", "يعمل على واتساب وانستغرام وفيسبوك"].map(f => (
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
              <h3 className="text-3xl font-bold text-white mb-4">صندوق وارد موحد</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                إدارة جميع محادثاتك من واتساب وفيسبوك وانستغرام في مكان واحد. لا تفوّت أي عميل.
              </p>
              <ul className="space-y-3">
                {["كل القنوات في واجهة واحدة", "تصنيف المحادثات وتوزيع المهام", "ردود سريعة وقوالب جاهزة", "تنبيهات فورية للمحادثات المهمة"].map(f => (
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
              <h3 className="text-3xl font-bold text-white mb-4">CRM Pipeline متكامل</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                تتبع كل ليد في رحلة المبيعات من الاستفسار حتى الإغلاق. كل شيء منظم وواضح لفريقك.
              </p>
              <ul className="space-y-3">
                {["كانبان بصري لخط المبيعات", "تتبع كل مرحلة من مراحل الصفقة", "تقارير أداء الفريق والتحويل", "تذكيرات متابعة تلقائية"].map(f => (
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
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">كيف يعمل</Badge>
            <h2 className="text-4xl font-heading font-bold text-gray-900 mb-4">ثلاث خطوات للنجاح</h2>
            <p className="text-lg text-gray-600">من التسجيل إلى أول صفقة في أقل من يوم</p>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines */}
            <div className="hidden md:block absolute top-16 right-1/3 left-1/3 h-0.5 bg-gradient-to-r from-indigo-300 to-purple-300 z-0"></div>

            {HOW_IT_WORKS.map((step, i) => (
              <AnimateIn key={step.step} direction="up" delay={i * 120}>
                <div className="text-center relative z-10" data-testid={`step-${i + 1}`}>
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} text-white text-2xl font-extrabold flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                    <step.icon className="h-7 w-7" />
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
          {/* Company logos strip */}
          <AnimateIn direction="up" className="text-center mb-10">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">شركات رائدة تثق بنا</p>
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
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">شهادات العملاء</Badge>
            <h2 className="text-4xl font-heading font-bold text-gray-900">ماذا يقول عملاؤنا؟</h2>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <AnimateIn key={t.name} direction="up" delay={i * 100}>
                <div
                  className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all h-full"
                  data-testid={`testimonial-${t.name}`}
                >
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, idx) => (
                      <Star key={idx} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">"{t.content}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                    <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.role} — {t.company}</div>
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
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">الأسئلة الشائعة</Badge>
            <h2 className="text-4xl font-heading font-bold text-gray-900 mb-4">كل ما تريد معرفته</h2>
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
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-800"></div>
        {/* Mesh pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }}>
        </div>
        {/* Glow orbs */}
        <div className="absolute top-0 right-1/4 h-64 w-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/4 h-64 w-64 bg-purple-400/20 rounded-full blur-3xl"></div>

        <AnimateIn direction="scale" className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-heading font-extrabold text-white mb-5">
            جاهز لمضاعفة مبيعاتك؟
          </h2>
          <p className="text-xl text-indigo-200 mb-10 leading-relaxed">
            انضم لأكثر من 500 شركة تستخدم SalesBot AI لتحويل محادثاتها إلى عملاء.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-10 bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl font-bold" data-testid="button-footer-cta">
                ابدأ مجاناً الآن
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-lg px-10 border-white/40 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm" data-testid="button-footer-contact">
                تحدث مع فريقنا
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-indigo-300">
            ✓ 14 يوم مجاناً &nbsp; ✓ بدون بطاقة ائتمانية &nbsp; ✓ إلغاء في أي وقت
          </p>
        </AnimateIn>
      </section>
    </>
  );
}
