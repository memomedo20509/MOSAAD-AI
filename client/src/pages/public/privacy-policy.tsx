export default function PrivacyPolicyPage() {
  return (
    <>
      <title>سياسة الخصوصية - SalesBot AI</title>
      <meta name="description" content="سياسة الخصوصية لمنصة SalesBot AI - كيف نجمع بياناتك ونحميها." />

      <section className="py-16 bg-white" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-privacy-headline">سياسة الخصوصية</h1>
          <p className="text-gray-500 mb-8">آخر تحديث: أبريل 2026</p>

          <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">١. مقدمة</h2>
              <p>
                نحن في SalesBot AI نلتزم بحماية خصوصيتك وأمان بياناتك. تشرح هذه السياسة
                كيفية جمع بياناتك واستخدامها ومشاركتها عند استخدامك لمنصتنا.
              </p>
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
              <p>
                لا نبيع بياناتك الشخصية لأطراف ثالثة. قد نشارك البيانات مع:
              </p>
              <ul className="list-disc pr-6 space-y-2 mt-3">
                <li>مزودي الخدمات التقنية الضرورية لتشغيل المنصة (مثل خدمات السحابة).</li>
                <li>الجهات القانونية عند الضرورة القانونية.</li>
                <li>شركاء العمل عند حصولنا على موافقتك الصريحة.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">٥. أمان البيانات</h2>
              <p>
                نستخدم أعلى معايير الأمان لحماية بياناتك، بما يشمل:
              </p>
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
              <p>
                نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر إعداداتك.
                يمكنك التحكم فيها من إعدادات متصفحك.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">٨. التواصل معنا</h2>
              <p>
                لأي استفسار عن سياسة الخصوصية، تواصل معنا على:
                <a href="mailto:privacy@salesbot.ai" className="text-primary hover:underline mr-2">privacy@salesbot.ai</a>
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
