import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import {
  Bot, Inbox, Users, BarChart3, BookOpen, Megaphone,
  ChevronRight, Star, CheckCircle2, ArrowLeft, Zap, Shield, Clock
} from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

const FEATURES = [
  {
    icon: Bot,
    title: "شات بوت AI",
    desc: "بوت ذكي يرد على العملاء 24/7 ويجمع بياناتهم تلقائياً عبر واتساب وجميع القنوات.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Inbox,
    title: "صندوق وارد موحد",
    desc: "إدارة جميع المحادثات من واتساب وفيسبوك وانستغرام في مكان واحد.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Users,
    title: "CRM متكامل",
    desc: "تتبع الليدز في كل مرحلة من مراحل المبيعات مع خط مبيعات كامل وتقارير.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Megaphone,
    title: "حملات واتساب",
    desc: "أرسل رسائل مجمعة مستهدفة بأعلى معدلات القراءة والتحويل.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: BarChart3,
    title: "تحليلات متقدمة",
    desc: "لوحات تحكم تفصيلية لأداء الفريق والمبيعات واتجاهات السوق.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: BookOpen,
    title: "قاعدة المعرفة",
    desc: "درِّب البوت على منتجاتك وخدماتك ليجيب بدقة على كل استفسار.",
    color: "bg-teal-50 text-teal-600",
  },
];

const HOW_IT_WORKS = [
  {
    step: "١",
    title: "سجّل وأعدّ البوت",
    desc: "أنشئ حسابك في دقائق، وصل قنواتك، وأدخل معلومات منتجاتك.",
  },
  {
    step: "٢",
    title: "البوت يستقبل ويؤهّل",
    desc: "الذكاء الاصطناعي يرد تلقائياً على العملاء ويجمع بياناتهم ويرشدهم.",
  },
  {
    step: "٣",
    title: "فريقك يُغلق الصفقات",
    desc: "يصلك الليد مؤهلاً جاهزاً للتحويل في CRM متكامل مع كل تاريخه.",
  },
];

const TESTIMONIALS = [
  {
    name: "أحمد السيد",
    role: "مدير مبيعات، شركة عقارات القاهرة",
    content: "ارتفعت معدلات تحويل الليدز بنسبة ٦٥٪ في أول شهرين. البوت يرد في ثوانٍ حتى في منتصف الليل!",
    rating: 5,
  },
  {
    name: "سارة الأنصاري",
    role: "مؤسسة، استشارات سارة",
    content: "وفّرت على فريقي ٤ ساعات يومياً من الردود المتكررة. الآن يركزون فقط على العملاء الجاهزين للشراء.",
    rating: 5,
  },
  {
    name: "محمد العمري",
    role: "رئيس تنفيذي، مجموعة النيل للتطوير",
    content: "أفضل استثمار قمنا به هذا العام. الـ ROI كان واضحاً من الأسبوع الأول.",
    rating: 5,
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
    q: "ما عدد المستخدمين الذين يمكنني إضافتهم؟",
    a: "يعتمد على الخطة. الخطة الأساسية تشمل 5 مستخدمين، والمتقدمة تشمل عدداً غير محدود.",
  },
  {
    q: "هل هناك نسخة تجريبية مجانية؟",
    a: "نعم! جميع الخطط تأتي مع تجربة مجانية 14 يوماً بدون بطاقة ائتمانية.",
  },
  {
    q: "هل يدعم اللغة العربية؟",
    a: "طبعاً! النظام مبني أساساً للسوق العربي ويدعم العربية بشكل كامل، بالإضافة للإنجليزية.",
  },
];

function PricingPreview() {
  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const displayPlans = plans?.slice(0, 3) ?? [];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">أسعار واضحة وبسيطة</h2>
          <p className="text-lg text-gray-600">ابدأ مجاناً، وسّع عندما تنمو</p>
        </div>

        {displayPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {displayPlans.map((plan, i) => (
              <Card key={plan.id} className={`relative ${i === 1 ? "border-primary shadow-lg scale-105" : ""}`}>
                {i === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">الأكثر شعبية</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.nameAr}</h3>
                  <div className="text-3xl font-bold text-primary my-3">
                    ${plan.priceMonthly}<span className="text-sm text-gray-500 font-normal">/شهر</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  <Link href="/register">
                    <Button className="w-full" variant={i === 1 ? "default" : "outline"} data-testid={`button-plan-cta-${plan.id}`}>
                      ابدأ مجاناً
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { name: "أساسي", price: "49", desc: "للشركات الناشئة", popular: false },
              { name: "محترف", price: "149", desc: "للفرق المتنامية", popular: true },
              { name: "مؤسسي", price: "399", desc: "للمؤسسات الكبيرة", popular: false },
            ].map((p, i) => (
              <Card key={p.name} className={`relative ${p.popular ? "border-primary shadow-lg scale-105" : ""}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">الأكثر شعبية</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{p.name}</h3>
                  <div className="text-3xl font-bold text-primary my-3">
                    ${p.price}<span className="text-sm text-gray-500 font-normal">/شهر</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{p.desc}</p>
                  <Link href="/register">
                    <Button className="w-full" variant={p.popular ? "default" : "outline"}>
                      ابدأ مجاناً
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/pricing">
            <Button variant="ghost" className="gap-2">
              مقارنة تفصيلية للخطط
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <title>SalesBot AI - منصة الذكاء الاصطناعي لإدارة المبيعات والمحادثات</title>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-blue-50 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 text-sm">
              🚀 الجيل القادم من CRM للمبيعات
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" data-testid="text-hero-headline">
              حوّل كل محادثة إلى{" "}
              <span className="text-primary">صفقة ناجحة</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed" data-testid="text-hero-desc">
              بوت ذكي يدير محادثاتك ويؤهّل عملاءك تلقائياً، مع CRM متكامل يحوّلهم إلى صفقات حقيقية.
              وفّر وقت فريقك وضاعف مبيعاتك.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2 text-lg px-8" data-testid="button-hero-cta">
                  ابدأ تجربتك المجانية
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-hero-demo">
                  طلب عرض تجريبي
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              ✓ 14 يوم مجاناً &nbsp; ✓ بدون بطاقة ائتمانية &nbsp; ✓ إلغاء في أي وقت
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "+500", label: "شركة تثق بنا" },
              { value: "65%", label: "زيادة التحويل" },
              { value: "24/7", label: "دعم متواصل" },
              { value: "4ساعة", label: "توفير يومي للفريق" },
            ].map((s) => (
              <div key={s.label} data-testid={`stat-${s.label}`}>
                <div className="text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-sm text-gray-600 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              منصة متكاملة تجمع الذكاء الاصطناعي مع إدارة علاقات العملاء
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-feature-${f.title}`}>
                <CardContent className="p-6">
                  <div className={`h-12 w-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">كيف يعمل النظام؟</h2>
            <p className="text-lg text-gray-600">ثلاث خطوات بسيطة للحصول على نتائج استثنائية</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="text-center" data-testid={`step-${i + 1}`}>
                <div className="h-16 w-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">ماذا يقول عملاؤنا؟</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border shadow-sm" data-testid={`testimonial-${t.name}`}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">"{t.content}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <PricingPreview />

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">أسئلة شائعة</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4" data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-right font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-gray-600">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            جاهز لمضاعفة مبيعاتك؟
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            انضم لأكثر من 500 شركة تستخدم SalesBot AI لتحويل محادثاتها إلى عملاء.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8" data-testid="button-footer-cta">
                ابدأ مجاناً الآن
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary" data-testid="button-footer-contact">
                تحدث مع فريقنا
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
