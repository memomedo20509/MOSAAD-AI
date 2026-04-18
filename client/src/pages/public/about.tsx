import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Eye, Heart, Users, Zap, Shield, Globe, Star } from "lucide-react";
import { AnimateIn } from "@/components/animate-in";

const VALUES = [
  {
    icon: Target,
    title: "هدفنا",
    desc: "تمكين كل شركة عربية من الاستفادة من الذكاء الاصطناعي في مبيعاتها.",
    color: "from-orange-500 to-pink-500",
    bg: "bg-orange-50",
  },
  {
    icon: Eye,
    title: "رؤيتنا",
    desc: "أن نكون المنصة الأولى في الشرق الأوسط لأتمتة المبيعات بالذكاء الاصطناعي.",
    color: "from-indigo-500 to-blue-500",
    bg: "bg-indigo-50",
  },
  {
    icon: Heart,
    title: "قيمنا",
    desc: "الشفافية والثقة والنتائج الحقيقية — لا وعود فارغة.",
    color: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
  },
];

const TEAM_STATS = [
  { icon: Users, value: "50+", label: "متخصص في الفريق", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Globe, value: "15+", label: "دولة عربية", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: Zap, value: "2021", label: "سنة التأسيس", color: "text-orange-600", bg: "bg-orange-50" },
  { icon: Shield, value: "99.9%", label: "وقت التشغيل", color: "text-green-600", bg: "bg-green-50" },
  { icon: Star, value: "500+", label: "شركة عميلة", color: "text-yellow-600", bg: "bg-yellow-50" },
];

export default function AboutPage() {
  return (
    <>
      <title>من نحن - SalesBot AI</title>
      <meta name="description" content="تعرف على قصة SalesBot AI، مهمتنا، وفريقنا الساعي لتحويل المبيعات العربية بالذكاء الاصطناعي." />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 py-28">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}>
        </div>
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%)" }}>
        </div>
        <div className="absolute top-1/3 right-1/4 h-80 w-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-1/4 h-64 w-64 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/10 text-white border-white/20 mb-6 px-4 py-1.5">من نحن</Badge>
          <h1 className="text-5xl lg:text-6xl font-heading font-extrabold text-white mb-6 leading-tight" data-testid="text-about-headline">
            نبنيها لأصحاب الأعمال{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              العرب
            </span>
          </h1>
          <p className="text-xl text-indigo-200 leading-relaxed max-w-2xl mx-auto">
            بدأنا SalesBot AI لأننا رأينا بأم أعيننا كم تخسر الشركات العربية في الفرص بسبب
            بطء الرد وسوء التنظيم. قررنا تغيير ذلك.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {TEAM_STATS.map((s, i) => (
              <AnimateIn key={s.label} direction="up" delay={i * 80}>
                <div className="text-center group" data-testid={`stat-about-${s.label}`}>
                  <div className={`h-14 w-14 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`h-7 w-7 ${s.color}`} />
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimateIn direction="right">
              <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">القصة</Badge>
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">كيف بدأت الرحلة؟</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  في عام 2021، كنا نعمل مع عشرات الشركات العقارية والتجارية في المنطقة العربية.
                  لاحظنا نمطاً متكرراً: المبيعات تضيع ليس لأن المنتج سيء، بل لأن الرد جاء
                  متأخراً، أو لأن الليد لم يُتابَع بشكل صحيح.
                </p>
                <p>
                  واتساب أصبح القناة الرئيسية للتواصل في المنطقة، لكن إدارته يدوياً يستنزف
                  فرق المبيعات. قررنا بناء حل ذكي يجمع بين أتمتة الردود بالذكاء الاصطناعي
                  ونظام CRM متكامل مصمم خصيصاً للسوق العربي.
                </p>
                <p>
                  اليوم، أكثر من 500 شركة في مصر والسعودية والإمارات والكويت وعشرات الدول
                  الأخرى تستخدم SalesBot AI لتحويل محادثاتها إلى مبيعات حقيقية.
                </p>
              </div>
            </AnimateIn>

            {/* Visual card */}
            <AnimateIn direction="left" delay={120}>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100">
                <div className="space-y-4">
                  {[
                    { label: "متوسط زيادة التحويل", value: "65%", color: "text-indigo-600" },
                    { label: "توفير وقت الفريق يومياً", value: "4 ساعات", color: "text-purple-600" },
                    { label: "وقت الإعداد", value: "30 دقيقة", color: "text-green-600" },
                    { label: "دعة العملاء", value: "24/7", color: "text-orange-600" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm border border-white">
                      <span className="text-gray-600 text-sm">{item.label}</span>
                      <span className={`font-extrabold text-lg ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-12">
            <Badge className="bg-indigo-100 text-indigo-700 border-0 mb-4 px-4 py-1">مهمتنا وقيمنا</Badge>
            <h2 className="text-3xl font-display font-bold text-gray-900">ما الذي يحرّكنا؟</h2>
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v, i) => (
              <AnimateIn key={v.title} direction="up" delay={i * 100}>
                <div
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group"
                  data-testid={`card-value-${v.title}`}
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${v.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                    <v.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{v.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-800"></div>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}>
        </div>
        <AnimateIn direction="up" className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-display font-extrabold text-white mb-4">هل أنت مستعد للانضمام؟</h2>
          <p className="text-indigo-200 mb-8 text-lg">ابدأ تجربتك المجانية لمدة 14 يوماً اليوم.</p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl font-bold text-lg px-10" data-testid="button-about-cta">
              ابدأ مجاناً
            </Button>
          </Link>
        </AnimateIn>
      </section>
    </>
  );
}
