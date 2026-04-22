import { useLanguage } from "@/lib/i18n";

export default function TermsOfServicePage() {
  const { t, language, isRTL } = useLanguage();

  return (
    <>
      <title>{t.pub_termsPageTitle}</title>
      <meta name="description" content={t.pub_termsMetaDesc} />

      <section className="py-16 bg-white" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-terms-headline">{t.pub_termsTitle}</h1>
          <p className="text-gray-500 mb-8">{t.pub_termsLastUpdated}</p>

          {language === "ar" ? (
            <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">١. القبول بالشروط</h2>
                <p>باستخدامك لمنصة SalesBot AI، فأنت توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى التوقف عن استخدام المنصة.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٢. وصف الخدمة</h2>
                <p>SalesBot AI هي منصة SaaS تتيح للشركات إدارة محادثاتها مع العملاء عبر قنوات متعددة (واتساب، فيسبوك، انستغرام) من خلال نظام CRM متكامل مع ذكاء اصطناعي.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٣. حساب المستخدم</h2>
                <ul className="list-disc pr-6 space-y-2">
                  <li>أنت مسؤول عن الحفاظ على سرية بيانات حسابك.</li>
                  <li>يجب عليك إبلاغنا فوراً بأي استخدام غير مصرح به لحسابك.</li>
                  <li>يجب أن تكون المعلومات المقدمة عند التسجيل صحيحة وكاملة.</li>
                  <li>تحتفظ SalesBot AI بالحق في إنهاء أي حساب ينتهك هذه الشروط.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٤. الاستخدام المقبول</h2>
                <p>يُحظر استخدام المنصة في:</p>
                <ul className="list-disc pr-6 space-y-2 mt-3">
                  <li>إرسال رسائل مزعجة أو تسويق غير مرغوب فيه.</li>
                  <li>انتهاك قوانين حماية البيانات المعمول بها.</li>
                  <li>أي نشاط غير قانوني أو مضلل.</li>
                  <li>إعادة بيع الخدمة دون إذن كتابي مسبق.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٥. الاشتراك والدفع</h2>
                <ul className="list-disc pr-6 space-y-2">
                  <li>تبدأ الاشتراكات بفترة تجريبية مجانية 14 يوماً.</li>
                  <li>تُجدَّد الاشتراكات تلقائياً ما لم يتم الإلغاء قبل نهاية الدورة.</li>
                  <li>لا يحق استرداد الرسوم عن الفترات المنتهية.</li>
                  <li>تحتفظ الشركة بحق تغيير الأسعار مع إشعار مسبق 30 يوماً.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٦. الملكية الفكرية</h2>
                <p>جميع حقوق الملكية الفكرية للمنصة وتصميمها وكودها محفوظة لـ SalesBot AI. بياناتك تبقى ملكاً لك في جميع الأوقات.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٧. حدود المسؤولية</h2>
                <p>تُقدَّم الخدمة "كما هي" دون ضمانات صريحة أو ضمنية. لن تتجاوز مسؤوليتنا القصوى في أي حال من الأحوال المبلغ الذي دفعته خلال الأشهر الثلاثة الأخيرة.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٨. إنهاء الخدمة</h2>
                <p>يمكنك إنهاء اشتراكك في أي وقت. عند الإنهاء، ستبقى بياناتك متاحة للتصدير لمدة 30 يوماً قبل الحذف النهائي.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٩. التعديلات</h2>
                <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني أو داخل المنصة.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">١٠. القانون المنظِّم</h2>
                <p>تخضع هذه الشروط للقوانين المعمول بها. أي نزاع يُحل بالتراضي أولاً، ثم عبر التحكيم وفق القواعد المعمول بها.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">١١. التواصل معنا</h2>
                <p>لأي استفسار عن شروط الاستخدام: <a href="mailto:legal@salesbot.ai" className="text-primary hover:underline mr-2">legal@salesbot.ai</a></p>
              </section>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                <p>By using the SalesBot AI platform, you agree to be bound by these terms and conditions. If you do not agree to any part of them, please stop using the platform.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">2. Service Description</h2>
                <p>SalesBot AI is a SaaS platform that enables businesses to manage their customer conversations across multiple channels (WhatsApp, Facebook, Instagram) through a fully integrated CRM with artificial intelligence.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Account</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>You must notify us immediately of any unauthorized use of your account.</li>
                  <li>Information provided during registration must be accurate and complete.</li>
                  <li>SalesBot AI reserves the right to terminate any account that violates these terms.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">4. Acceptable Use</h2>
                <p>The platform may not be used for:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Sending spam or unsolicited marketing messages.</li>
                  <li>Violating applicable data protection laws.</li>
                  <li>Any illegal or misleading activities.</li>
                  <li>Reselling the service without prior written permission.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">5. Subscription & Payment</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Subscriptions start with a 14-day free trial.</li>
                  <li>Subscriptions auto-renew unless cancelled before the end of the billing cycle.</li>
                  <li>Fees for completed periods are non-refundable.</li>
                  <li>The company reserves the right to change prices with 30 days' prior notice.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">6. Intellectual Property</h2>
                <p>All intellectual property rights in the platform, its design, and code are owned by SalesBot AI. Your data remains your property at all times.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
                <p>The service is provided "as is" without express or implied warranties. Our maximum liability in any case shall not exceed the amount you paid in the last three months.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">8. Termination</h2>
                <p>You may cancel your subscription at any time. Upon termination, your data will remain available for export for 30 days before permanent deletion.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">9. Amendments</h2>
                <p>We reserve the right to modify these terms at any time. Users will be notified of any material changes via email or within the platform.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">10. Governing Law</h2>
                <p>These terms are governed by applicable laws. Any dispute shall be resolved amicably first, then through arbitration in accordance with applicable rules.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
                <p>For any inquiries about the Terms of Service: <a href="mailto:legal@salesbot.ai" className="text-primary hover:underline ml-2">legal@salesbot.ai</a></p>
              </section>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
