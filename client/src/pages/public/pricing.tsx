import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, X, Zap, Shield, Star } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";
import { AnimateIn } from "@/components/animate-in";
import { useLanguage } from "@/lib/i18n";

type FeatureRow = {
  labelAr: string;
  labelEn: string;
  key: keyof SubscriptionPlan;
  bool?: boolean;
  format?: (v: number, lang: string) => string;
};

const FEATURE_TABLE: FeatureRow[] = [
  { labelAr: "عدد المستخدمين", labelEn: "Max Users", key: "maxUsers", format: (v, lang) => v === -1 ? (lang === "ar" ? "غير محدود" : "Unlimited") : String(v) },
  { labelAr: "ليدز شهرياً", labelEn: "Leads/Month", key: "maxLeadsPerMonth", format: (v, lang) => v === -1 ? (lang === "ar" ? "غير محدود" : "Unlimited") : String(v) },
  { labelAr: "رسائل واتساب شهرياً", labelEn: "WhatsApp Messages/Month", key: "maxWhatsappMessagesPerMonth", format: (v, lang) => v === -1 ? (lang === "ar" ? "غير محدود" : "Unlimited") : String(v) },
  { labelAr: "قنوات التواصل", labelEn: "Channels", key: "maxChannels", format: (v) => String(v) },
  { labelAr: "شات بوت AI", labelEn: "AI Chatbot", key: "hasAiChatbot", bool: true },
  { labelAr: "حملات واتساب", labelEn: "WhatsApp Campaigns", key: "hasCampaigns", bool: true },
  { labelAr: "تحليلات متقدمة", labelEn: "Advanced Analytics", key: "hasAnalytics", bool: true },
  { labelAr: "قاعدة المعرفة", labelEn: "Knowledge Base", key: "hasKnowledgeBase", bool: true },
  { labelAr: "API Access", labelEn: "API Access", key: "hasApiAccess", bool: true },
  { labelAr: "دعم أولوية", labelEn: "Priority Support", key: "hasPrioritySupport", bool: true },
];

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: "starter", nameAr: "أساسي", name: "Starter", description: "للشركات الناشئة",
    priceMonthly: "49", priceAnnual: "470", currency: "USD",
    maxUsers: 5, maxLeadsPerMonth: 200, maxWhatsappMessagesPerMonth: 1000, maxChannels: 1,
    hasAiChatbot: true, hasCampaigns: false, hasAnalytics: false, hasKnowledgeBase: false,
    hasApiAccess: false, hasPrioritySupport: false, trialDays: 14, isActive: true, sortOrder: 1,
    createdAt: null,
  },
  {
    id: "pro", nameAr: "محترف", name: "Professional", description: "للفرق المتنامية",
    priceMonthly: "149", priceAnnual: "1430", currency: "USD",
    maxUsers: 20, maxLeadsPerMonth: 1000, maxWhatsappMessagesPerMonth: 5000, maxChannels: 3,
    hasAiChatbot: true, hasCampaigns: true, hasAnalytics: true, hasKnowledgeBase: true,
    hasApiAccess: false, hasPrioritySupport: false, trialDays: 14, isActive: true, sortOrder: 2,
    createdAt: null,
  },
  {
    id: "enterprise", nameAr: "مؤسسي", name: "Enterprise", description: "للمؤسسات الكبيرة",
    priceMonthly: "399", priceAnnual: "3830", currency: "USD",
    maxUsers: -1, maxLeadsPerMonth: -1, maxWhatsappMessagesPerMonth: -1, maxChannels: 10,
    hasAiChatbot: true, hasCampaigns: true, hasAnalytics: true, hasKnowledgeBase: true,
    hasApiAccess: true, hasPrioritySupport: true, trialDays: 14, isActive: true, sortOrder: 3,
    createdAt: null,
  },
];

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function PlanCard({
  plan,
  annual,
  popular,
}: {
  plan: SubscriptionPlan;
  annual: boolean;
  popular: boolean;
}) {
  const { t, language } = useLanguage();
  const monthly = Number(plan.priceMonthly);
  const annual_ = Number(plan.priceAnnual);
  const price = annual ? annual_ / 12 : monthly;
  const saving = monthly > 0
    ? Math.round(((monthly * 12 - annual_) / (monthly * 12)) * 100)
    : 0;
  const planName = language === "ar" ? plan.nameAr : plan.name;
  const descriptionVisible = plan.description && (
    (language === "ar" && isArabicText(plan.description)) ||
    (language === "en" && !isArabicText(plan.description))
  );

  if (popular) {
    return (
      <div className="relative flex flex-col rounded-2xl overflow-hidden" data-testid={`plan-card-${plan.id}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl"></div>
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-2xl"></div>
        <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20"></div>

        <div className="relative p-7 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-white">{planName}</h3>
              {descriptionVisible && <p className="text-sm text-indigo-200 mt-0.5">{plan.description}</p>}
            </div>
            <Badge className="bg-yellow-400 text-yellow-900 border-0 font-bold shadow-lg">
              <Star className="h-3 w-3 ml-1" /> {t.pub_mostPopular}
            </Badge>
          </div>

          <div className="mb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-white">${Math.round(price)}</span>
              <span className="text-indigo-200 text-sm">{t.pub_perMonth}</span>
            </div>
            {annual && saving > 0 && (
              <p className="text-indigo-300 text-xs mt-1">{t.pub_savingsLabel} {saving}%</p>
            )}
            {annual && (
              <p className="text-indigo-300 text-xs">${Math.round(annual_)} {t.pub_billedAnnually}</p>
            )}
          </div>

          <Link href="/register" className="mt-auto mb-4">
            <Button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg" data-testid={`button-plan-${plan.id}`}>
              {t.pub_startTrial}
            </Button>
          </Link>
          <p className="text-xs text-center text-indigo-300">{plan.trialDays}{t.pub_trialNote}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-7" data-testid={`plan-card-${plan.id}`}>
      <div className="mb-5">
        <h3 className="text-xl font-bold text-gray-900">{planName}</h3>
        {descriptionVisible && <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>}
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold text-indigo-600">${Math.round(price)}</span>
          <span className="text-gray-400 text-sm">{t.pub_perMonth}</span>
          {annual && saving > 0 && (
            <Badge variant="secondary" className="mr-2 text-xs text-green-700 bg-green-100">{t.pub_savingsLabel} {saving}%</Badge>
          )}
        </div>
        {annual && (
          <p className="text-xs text-gray-400 mt-1">${Math.round(annual_)} {t.pub_billedAnnually}</p>
        )}
      </div>

      <Link href="/register" className="mt-auto mb-4">
        <Button className="w-full" variant="outline" data-testid={`button-plan-${plan.id}`}>
          {t.pub_startTrial}
        </Button>
      </Link>
      <p className="text-xs text-center text-gray-400">{plan.trialDays}{t.pub_trialNote}</p>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { t, language } = useLanguage();

  const { data: fetchedPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/public/plans"],
  });

  const plans = (fetchedPlans && fetchedPlans.length > 0) ? fetchedPlans.slice(0, 3) : FALLBACK_PLANS;
  const middleIdx = Math.floor(plans.length / 2);

  const FAQS = [
    { q: t.pub_pricingFaq1Q, a: t.pub_pricingFaq1A },
    { q: t.pub_pricingFaq2Q, a: t.pub_pricingFaq2A },
    { q: t.pub_pricingFaq3Q, a: t.pub_pricingFaq3A },
    { q: t.pub_pricingFaq4Q, a: t.pub_pricingFaq4A },
  ];

  const TRUST_ITEMS = [
    { icon: Shield, title: t.pub_trustGuarantee, desc: t.pub_trustGuaranteeDesc },
    { icon: Zap, title: t.pub_trustCancel, desc: t.pub_trustCancelDesc },
    { icon: Star, title: t.pub_trustSupport, desc: t.pub_trustSupportDesc },
  ];

  return (
    <>
      <title>{t.pub_pricingBadge} - SalesBot AI</title>
      <meta name="description" content={t.pub_pricingHeroSubtitle} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 py-28">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}>
        </div>
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 25%)" }}>
        </div>
        <div className="absolute top-1/2 right-1/4 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 h-64 w-64 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/10 text-white border-white/20 mb-6 px-4 py-1.5">{t.pub_pricingBadge}</Badge>
          <h1 className="text-5xl font-heading font-extrabold text-white mb-5" data-testid="text-pricing-headline">
            {t.pub_pricingHeroTitle}
          </h1>
          <p className="text-xl text-indigo-200 mb-10">
            {t.pub_pricingHeroSubtitle}
          </p>

          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
            <button
              onClick={() => setAnnual(false)}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${!annual ? "bg-white text-indigo-700 shadow-md font-bold" : "text-white/70 hover:text-white"}`}
              data-testid="toggle-monthly"
            >
              {t.pub_monthly}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${annual ? "bg-white text-indigo-700 shadow-md font-bold" : "text-white/70 hover:text-white"}`}
              data-testid="toggle-annual"
            >
              {t.pub_annual}
              <span className="bg-green-400 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold">{t.pub_save20}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <AnimateIn key={plan.id} direction="up" delay={i * 100}>
                <PlanCard plan={plan} annual={annual} popular={i === middleIdx} />
              </AnimateIn>
            ))}
          </div>

          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {TRUST_ITEMS.map((item, i) => (
              <AnimateIn key={item.title} direction="up" delay={i * 80}>
                <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">{t.pub_comparePlansTitle}</h2>
            <p className="text-gray-500">{t.pub_comparePlansSubtitle}</p>
          </AnimateIn>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full border-collapse bg-white overflow-hidden">
              <thead>
                <tr>
                  <th className="text-right p-5 text-gray-500 font-medium text-sm w-1/3 bg-gray-50 border-b border-gray-100">{t.pub_featureColumn}</th>
                  {plans.map((p, i) => (
                    <th key={p.id} className={`p-5 text-center border-b border-gray-100 ${i === middleIdx ? "bg-indigo-50" : "bg-gray-50"}`}>
                      <div className={`font-bold text-sm ${i === middleIdx ? "text-indigo-700" : "text-gray-900"}`}>{language === "ar" ? p.nameAr : p.name}</div>
                      {i === middleIdx && <div className="text-[10px] text-indigo-500 mt-0.5">{t.pub_mostPopular}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_TABLE.map((row, i) => (
                  <tr key={row.key} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`} data-testid={`table-row-${row.key}`}>
                    <td className="p-4 text-gray-700 font-medium text-sm">{language === "ar" ? row.labelAr : row.labelEn}</td>
                    {plans.map((plan, pi) => {
                      const val = plan[row.key];
                      return (
                        <td key={plan.id} className={`p-4 text-center ${pi === middleIdx ? "bg-indigo-50/30" : ""}`}>
                          {row.bool ? (
                            val
                              ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                              : <X className="h-4 w-4 text-gray-300 mx-auto" />
                          ) : (
                            <span className="text-gray-900 font-semibold text-sm">
                              {row.format ? row.format(Number(val), language) : String(val)}
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateIn direction="up" className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">{t.pub_pricingFaqTitle}</h2>
          </AnimateIn>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AnimateIn key={i} direction="up" delay={i * 60}>
                <AccordionItem value={`faq-${i}`} className="border border-gray-200 rounded-xl px-5 bg-white shadow-sm" data-testid={`faq-pricing-${i}`}>
                  <AccordionTrigger className="text-right font-medium text-gray-900 hover:text-indigo-600 hover:no-underline">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">{faq.a}</AccordionContent>
                </AccordionItem>
              </AnimateIn>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-800"></div>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}>
        </div>
        <AnimateIn direction="up" className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-display font-extrabold text-white mb-4">{t.pub_ctaTitle}</h2>
          <p className="text-indigo-200 mb-8 text-lg">{t.pub_ctaDesc}</p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-xl font-bold text-lg px-10" data-testid="button-pricing-cta">
              {t.pub_ctaButton}
            </Button>
          </Link>
        </AnimateIn>
      </section>
    </>
  );
}
