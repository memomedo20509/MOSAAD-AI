import { useLanguage } from "@/lib/i18n";

export default function PrivacyPolicyPage() {
  const { t, language, isRTL } = useLanguage();

  return (
    <>
      <title>{t.pub_privacyPageTitle}</title>
      <meta name="description" content={t.pub_privacyMetaDesc} />

      <section className="py-16 bg-white" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-privacy-headline">{t.pub_privacyTitle}</h1>
          <p className="text-gray-500 mb-8">{t.pub_privacyLastUpdated}</p>

          {language === "ar" ? (
            <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">١. مقدمة</h2>
                <p>نحن في SalesBot AI نلتزم بحماية خصوصيتك وأمان بياناتك. تشرح هذه السياسة كيفية جمع بياناتك واستخدامها ومشاركتها عند استخدامك لمنصتنا.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٢. البيانات التي نجمعها</h2>
                <p>نقوم بجمع الأنواع التالية من البيانات:</p>
                <ul className="list-disc pr-6 space-y-2 mt-3">
                  <li><strong>بيانات الحساب:</strong> الاسم والبريد الإلكتروني ورقم الهاتف عند التسجيل.</li>
                  <li><strong>بيانات الشركة:</strong> اسم الشركة والقطاع وحجم الفريق.</li>
                  <li><strong>بيانات الاستخدام:</strong> سجلات الجلسات وإجراءات المستخدمين ومقاييس الأداء.</li>
                  <li><strong>بيانات المحادثات:</strong> رسائل العملاء التي تمر عبر المنصة لأغراض تشغيل الخدمة.</li>
                  <li><strong>البيانات التقنية:</strong> عنوان IP ونوع المتصفح ونظام التشغيل.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٣. كيف نستخدم بياناتك</h2>
                <ul className="list-disc pr-6 space-y-2">
                  <li>تشغيل الخدمة وتقديمها وتحسينها.</li>
                  <li>إرسال إشعارات تقنية وتحديثات الخدمة.</li>
                  <li>دعم العملاء والرد على استفساراتهم.</li>
                  <li>تحليل أنماط الاستخدام لتطوير الميزات.</li>
                  <li>الامتثال للمتطلبات القانونية والتنظيمية.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٤. مشاركة البيانات</h2>
                <p>لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك البيانات مع:</p>
                <ul className="list-disc pr-6 space-y-2 mt-3">
                  <li>مزودي الخدمات التقنية الضرورية لتشغيل المنصة (مثل خدمات السحابة).</li>
                  <li>الجهات القانونية عند الضرورة القانونية.</li>
                  <li>شركاء العمل عند حصولنا على موافقتك الصريحة.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٥. أمان البيانات</h2>
                <p>نستخدم أعلى معايير الأمان لحماية بياناتك، بما يشمل:</p>
                <ul className="list-disc pr-6 space-y-2 mt-3">
                  <li>تشفير البيانات أثناء النقل والتخزين (TLS/AES-256).</li>
                  <li>عزل بيانات كل شركة في بيئة مستقلة (Multi-tenancy).</li>
                  <li>مراجعات أمنية دورية واختبارات اختراق.</li>
                  <li>صلاحيات وصول محدودة للموظفين.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٦. حقوقك</h2>
                <p>لك الحق في:</p>
                <ul className="list-disc pr-6 space-y-2 mt-3">
                  <li>الاطلاع على بياناتك الشخصية المخزنة لدينا.</li>
                  <li>تصحيح أي بيانات غير دقيقة.</li>
                  <li>طلب حذف بياناتك (الحق في النسيان).</li>
                  <li>الاعتراض على معالجة بياناتك لأغراض التسويق.</li>
                  <li>نقل بياناتك إلى خدمة أخرى.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٧. ملفات تعريف الارتباط (Cookies)</h2>
                <p>نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر إعداداتك. يمكنك التحكم فيها من إعدادات متصفحك.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">٨. التواصل معنا</h2>
                <p>لأي استفسار عن سياسة الخصوصية، تواصل معنا على: <a href="mailto:privacy@salesbot.ai" className="text-primary hover:underline mr-2">privacy@salesbot.ai</a></p>
              </section>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
                <p>At SalesBot AI, we are committed to protecting your privacy and the security of your data. This policy explains how we collect, use, and share your data when you use our platform.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">2. Data We Collect</h2>
                <p>We collect the following types of data:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li><strong>Account Data:</strong> Name, email address, and phone number at registration.</li>
                  <li><strong>Company Data:</strong> Company name, industry, and team size.</li>
                  <li><strong>Usage Data:</strong> Session logs, user actions, and performance metrics.</li>
                  <li><strong>Conversation Data:</strong> Customer messages passing through the platform for service operation purposes.</li>
                  <li><strong>Technical Data:</strong> IP address, browser type, and operating system.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Operating, providing, and improving the service.</li>
                  <li>Sending technical notifications and service updates.</li>
                  <li>Customer support and responding to inquiries.</li>
                  <li>Analyzing usage patterns to develop features.</li>
                  <li>Complying with legal and regulatory requirements.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Sharing</h2>
                <p>We do not sell your personal data to third parties. We may share data with:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Technical service providers necessary to operate the platform (such as cloud services).</li>
                  <li>Legal authorities when legally required.</li>
                  <li>Business partners with your explicit consent.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
                <p>We use the highest security standards to protect your data, including:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Data encryption in transit and at rest (TLS/AES-256).</li>
                  <li>Data isolation for each company in an independent environment (Multi-tenancy).</li>
                  <li>Regular security audits and penetration tests.</li>
                  <li>Limited employee access permissions.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Access your personal data stored with us.</li>
                  <li>Correct any inaccurate data.</li>
                  <li>Request deletion of your data (right to be forgotten).</li>
                  <li>Object to processing of your data for marketing purposes.</li>
                  <li>Transfer your data to another service.</li>
                </ul>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies</h2>
                <p>We use cookies to improve your experience and remember your settings. You can control them from your browser settings.</p>
              </section>
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-3">8. Contact Us</h2>
                <p>For any inquiries about the Privacy Policy, contact us at: <a href="mailto:privacy@salesbot.ai" className="text-primary hover:underline ml-2">privacy@salesbot.ai</a></p>
              </section>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
