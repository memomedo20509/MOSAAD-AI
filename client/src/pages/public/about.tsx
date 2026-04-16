import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Heart, Users, Zap, Shield } from "lucide-react";

const VALUES = [
  { icon: Target, title: "هدفنا", desc: "تمكين كل شركة عربية من الاستفادة من الذكاء الاصطناعي في مبيعاتها." },
  { icon: Eye, title: "رؤيتنا", desc: "أن نكون المنصة الأولى في الشرق الأوسط لأتمتة المبيعات بالذكاء الاصطناعي." },
  { icon: Heart, title: "قيمنا", desc: "الشفافية والثقة والنتائج الحقيقية — لا وعود فارغة." },
];

const TEAM_HIGHLIGHTS = [
  { icon: Users, value: "50+", label: "متخصص في الفريق" },
  { icon: Zap, value: "2021", label: "سنة التأسيس" },
  { icon: Shield, value: "99.9%", label: "وقت التشغيل" },
];

export default function AboutPage() {
  return (
    <>
      <title>من نحن - SalesBot AI</title>
      <meta name="description" content="تعرف على قصة SalesBot AI، مهمتنا، وفريقنا الساعي لتحويل المبيعات العربية بالذكاء الاصطناعي." />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 to-blue-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6" data-testid="text-about-headline">
            نبنيها لأصحاب الأعمال العرب
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            بدأنا SalesBot AI لأننا رأينا بأم أعيننا كم تخسر الشركات العربية في الفرص بسبب
            بطء الرد وسوء التنظيم. قررنا تغيير ذلك.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-gray-700" dir="rtl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">القصة</h2>
            <p className="leading-relaxed mb-4">
              في عام 2021، كنا نعمل مع عشرات الشركات العقارية والتجارية في المنطقة العربية.
              لاحظنا نمطاً متكرراً: المبيعات تضيع ليس لأن المنتج سيء، بل لأن الرد جاء
              متأخراً، أو لأن الليد لم يُتابَع بشكل صحيح.
            </p>
            <p className="leading-relaxed mb-4">
              واتساب أصبح القناة الرئيسية للتواصل في المنطقة، لكن إدارته يدوياً يستنزف
              فرق المبيعات. قررنا بناء حل ذكي يجمع بين أتمتة الردود بالذكاء الاصطناعي
              ونظام CRM متكامل مصمم خصيصاً للسوق العربي.
            </p>
            <p className="leading-relaxed">
              اليوم، أكثر من 500 شركة في مصر والسعودية والإمارات والكويت وعشرات الدول الأخرى
              تستخدم SalesBot AI لتحويل محادثاتها إلى مبيعات حقيقية.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">مهمتنا وقيمنا</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <Card key={v.title} className="border-0 shadow-sm" data-testid={`card-value-${v.title}`}>
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <v.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-gray-600">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team highlights */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {TEAM_HIGHLIGHTS.map((h) => (
              <div key={h.label} data-testid={`stat-about-${h.label}`}>
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <h.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{h.value}</div>
                <div className="text-gray-600 mt-1">{h.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">هل أنت مستعد للانضمام؟</h2>
          <p className="text-primary-foreground/90 mb-6">ابدأ تجربتك المجانية لمدة 14 يوماً اليوم.</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" data-testid="button-about-cta">
              ابدأ مجاناً
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
