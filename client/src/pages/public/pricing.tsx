import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";

const FEATURE_TABLE = [
  { label: "عدد المستخدمين", key: "maxUsers", format: (v: number) => v === -1 ? "غير محدود" : String(v) },
  { label: "ليدز شهرياً", key: "maxLeadsPerMonth", format: (v: number) => v === -1 ? "غير محدود" : String(v) },
  { label: "رسائل واتساب شهرياً", key: "maxWhatsappMessagesPerMonth", format: (v: number) => v === -1 ? "غير محدود" : String(v) },
  { label: "قنوات التواصل", key: "maxChannels", format: (v: number) => String(v) },
  { label: "شات بوت AI", key: "hasAiChatbot", bool: true },
  { label: "حملات واتساب", key: "hasCampaigns", bool: true },
  { label: "تحليلات متقدمة", key: "hasAnalytics", bool: true },
  { label: "قاعدة المعرفة", key: "hasKnowledgeBase", bool: true },
  { label: "API Access", key: "hasApiAccess", bool: true },
  { label: "دعم أولوية", key: "hasPrioritySupport", bool: true },
];

const FAQS = [
  {
    q: "هل يمكن الترقية أو التخفيض في أي وقت؟",
    a: "نعم، يمكنك تغيير خطتك في أي وقت. الترقية فورية، والتخفيض يبدأ في دورة الفوترة التالية.",
  },
  {
    q: "ماذا يحدث بعد انتهاء الفترة التجريبية؟",
    a: "ستتلقى إشعاراً قبل 3 أيام من انتهاء التجربة. يمكنك الاشتراك أو إلغاء الحساب.",
  },
  {
    q: "هل هناك رسوم إعداد؟",
    a: "لا توجد رسوم إعداد. تدفع فقط رسوم الاشتراك الشهري أو السنوي.",
  },
  {
    q: "هل يمكن إلغاء الاشتراك في أي وقت؟",
    a: "نعم، الإلغاء سهل وفوري دون رسوم إضافية.",
  },
];

function PlanCard({
  plan,
  annual,
  popular,
}: {
  plan: SubscriptionPlan;
  annual: boolean;
  popular: boolean;
}) {
  const price = annual ? plan.priceAnnual / 12 : plan.priceMonthly;
  const saving = plan.priceMonthly > 0
    ? Math.round(((plan.priceMonthly * 12 - plan.priceAnnual) / (plan.priceMonthly * 12)) * 100)
    : 0;

  return (
    <Card className={`relative flex flex-col ${popular ? "border-primary shadow-xl scale-105" : "border shadow"}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary px-4">الأكثر شعبية</Badge>
        </div>
      )}
      <CardContent className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.nameAr}</h3>
        {plan.description && <p className="text-sm text-gray-500 mb-4">{plan.description}</p>}

        <div className="my-4">
          <span className="text-4xl font-bold text-primary">${Math.round(price)}</span>
          <span className="text-gray-500 text-sm mr-1">/شهر</span>
          {annual && saving > 0 && (
            <Badge variant="secondary" className="mr-2 text-xs">وفّر {saving}٪</Badge>
          )}
        </div>

        {annual && (
          <p className="text-xs text-gray-500 mb-4">يُفوتر ${Math.round(plan.priceAnnual)} سنوياً</p>
        )}

        <Link href="/register" className="mt-auto">
          <Button className="w-full" variant={popular ? "default" : "outline"} data-testid={`button-plan-${plan.id}`}>
            ابدأ تجربة مجانية
          </Button>
        </Link>

        <p className="text-xs text-center text-gray-400 mt-2">
          {plan.trialDays} يوم مجاناً — بدون بطاقة ائتمانية
        </p>
      </CardContent>
    </Card>
  );
}

const FALLBACK_PLANS = [
  {
    id: "starter", nameAr: "أساسي", name: "Starter", description: "للشركات الناشئة",
    priceMonthly: 49, priceAnnual: 470, currency: "USD",
    maxUsers: 5, maxLeadsPerMonth: 200, maxWhatsappMessagesPerMonth: 1000, maxChannels: 1,
    hasAiChatbot: true, hasCampaigns: false, hasAnalytics: false, hasKnowledgeBase: false,
    hasApiAccess: false, hasPrioritySupport: false, trialDays: 14, isActive: true, sortOrder: 1,
    createdAt: null,
  },
  {
    id: "pro", nameAr: "محترف", name: "Professional", description: "للفرق المتنامية",
    priceMonthly: 149, priceAnnual: 1430, currency: "USD",
    maxUsers: 20, maxLeadsPerMonth: 1000, maxWhatsappMessagesPerMonth: 5000, maxChannels: 3,
    hasAiChatbot: true, hasCampaigns: true, hasAnalytics: true, hasKnowledgeBase: true,
    hasApiAccess: false, hasPrioritySupport: false, trialDays: 14, isActive: true, sortOrder: 2,
    createdAt: null,
  },
  {
    id: "enterprise", nameAr: "مؤسسي", name: "Enterprise", description: "للمؤسسات الكبيرة",
    priceMonthly: 399, priceAnnual: 3830, currency: "USD",
    maxUsers: -1, maxLeadsPerMonth: -1, maxWhatsappMessagesPerMonth: -1, maxChannels: 10,
    hasAiChatbot: true, hasCampaigns: true, hasAnalytics: true, hasKnowledgeBase: true,
    hasApiAccess: true, hasPrioritySupport: true, trialDays: 14, isActive: true, sortOrder: 3,
    createdAt: null,
  },
] as SubscriptionPlan[];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { data: fetchedPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const plans = (fetchedPlans && fetchedPlans.length > 0) ? fetchedPlans.slice(0, 3) : FALLBACK_PLANS;
  const middleIdx = Math.floor(plans.length / 2);

  return (
    <>
      <title>الأسعار - SalesBot AI</title>
      <meta name="description" content="أسعار واضحة وشفافة لمنصة SalesBot AI. ابدأ مجاناً لمدة 14 يوماً." />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 to-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-pricing-headline">
            أسعار تناسب كل نمو
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            ابدأ مجاناً 14 يوماً، بدون بطاقة ائتمانية
          </p>

          <div className="flex items-center justify-center gap-3" dir="ltr">
            <Label htmlFor="billing-toggle" className="text-gray-700 font-medium">شهري</Label>
            <Switch
              id="billing-toggle"
              checked={annual}
              onCheckedChange={setAnnual}
              data-testid="toggle-billing"
            />
            <Label htmlFor="billing-toggle" className="text-gray-700 font-medium">
              سنوي
              <Badge variant="secondary" className="mr-2 text-xs">وفّر حتى 20٪</Badge>
            </Label>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} annual={annual} popular={i === middleIdx} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">مقارنة تفصيلية للمميزات</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-xl shadow-sm overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right p-4 text-gray-600 font-medium w-1/3">الميزة</th>
                  {plans.map(p => (
                    <th key={p.id} className="p-4 text-center text-gray-900 font-bold">{p.nameAr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_TABLE.map((row, i) => (
                  <tr key={row.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"} data-testid={`table-row-${row.key}`}>
                    <td className="p-4 text-gray-700 font-medium">{row.label}</td>
                    {plans.map(plan => {
                      const val = (plan as any)[row.key];
                      return (
                        <td key={plan.id} className="p-4 text-center">
                          {row.bool ? (
                            val
                              ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                              : <X className="h-5 w-5 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-gray-900 font-medium">
                              {row.format ? row.format(val) : val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">أسئلة عن الأسعار</h2>
          <Accordion type="single" collapsible>
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} data-testid={`faq-pricing-${i}`}>
                <AccordionTrigger className="text-right">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-gray-600">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">ابدأ تجربتك المجانية اليوم</h2>
          <p className="text-primary-foreground/90 mb-6">14 يوماً مجاناً — بدون بطاقة ائتمانية — إلغاء في أي وقت.</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" data-testid="button-pricing-cta">
              ابدأ مجاناً
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
