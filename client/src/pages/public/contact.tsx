import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Phone, MapPin, Loader2, CheckCircle, Clock, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/public/contact", form);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>تواصل معنا - SalesBot AI</title>
      <meta name="description" content="تواصل مع فريق SalesBot AI لأي استفسار أو طلب عرض تجريبي." />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 py-28">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}>
        </div>
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)" }}>
        </div>
        <div className="absolute top-1/2 right-1/3 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-white/10 text-white border-white/20 mb-6 px-4 py-1.5">تواصل معنا</Badge>
          <h1 className="text-5xl font-heading font-extrabold text-white mb-5" data-testid="text-contact-headline">
            كيف يمكننا{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              مساعدتك؟
            </span>
          </h1>
          <p className="text-xl text-indigo-200">
            فريقنا جاهز للإجابة على جميع استفساراتك — نرد خلال ساعات
          </p>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact info — 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">معلومات التواصل</h2>
                <p className="text-gray-500 text-sm">يسعدنا الاستماع إليك والإجابة على كل تساؤلاتك</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-0.5">البريد الإلكتروني</div>
                    <a href="mailto:hello@salesbot.ai" className="text-indigo-600 hover:text-indigo-700 text-sm hover:underline">
                      hello@salesbot.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shrink-0 shadow-md">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-0.5">الهاتف / واتساب</div>
                    <a
                      href="https://wa.me/201000000000"
                      className="text-indigo-600 hover:text-indigo-700 text-sm hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +20 100 000 0000
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-0.5">الموقع</div>
                    <div className="text-gray-600 text-sm">القاهرة، جمهورية مصر العربية</div>
                  </div>
                </div>
              </div>

              {/* Support hours */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">أوقات الدعم</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>الأحد - الخميس</span>
                    <span className="font-medium text-gray-900">9 ص - 6 م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الجمعة - السبت</span>
                    <span className="font-medium text-gray-900">10 ص - 4 م</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-100">
                    <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-green-700 font-medium">البوت يرد 24/7 على جميع القنوات!</span>
                  </div>
                </div>
              </div>

              {/* Quick message via WA */}
              <a
                href="https://wa.me/201000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl p-5 transition-colors shadow-md shadow-green-500/30"
              >
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">تحدث معنا على واتساب</div>
                  <div className="text-green-100 text-xs">رد فوري في ثوانٍ</div>
                </div>
              </a>
            </div>

            {/* Contact form — 3 columns */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm" data-testid="contact-success">
                  <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mb-5">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">تم الإرسال بنجاح!</h3>
                  <p className="text-gray-600 max-w-sm">
                    شكراً لتواصلك معنا. سيقوم فريقنا بالرد عليك خلال 24 ساعة.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">أرسل لنا رسالة</h3>
                  <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-contact">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-sm font-medium text-gray-700">الاسم *</Label>
                        <Input
                          id="contact-name"
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          required
                          placeholder="اسمك الكامل"
                          className="rounded-xl"
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-sm font-medium text-gray-700">البريد الإلكتروني *</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          required
                          placeholder="email@example.com"
                          className="rounded-xl"
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-phone" className="text-sm font-medium text-gray-700">رقم الهاتف</Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          value={form.phone}
                          onChange={e => setForm({ ...form, phone: e.target.value })}
                          placeholder="+20 100 000 0000"
                          className="rounded-xl"
                          data-testid="input-contact-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-company" className="text-sm font-medium text-gray-700">اسم الشركة</Label>
                        <Input
                          id="contact-company"
                          value={form.company}
                          onChange={e => setForm({ ...form, company: e.target.value })}
                          placeholder="شركتك"
                          className="rounded-xl"
                          data-testid="input-contact-company"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message" className="text-sm font-medium text-gray-700">الرسالة *</Label>
                      <Textarea
                        id="contact-message"
                        rows={5}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        placeholder="كيف يمكننا مساعدتك؟"
                        required
                        className="rounded-xl resize-none"
                        data-testid="input-contact-message"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg rounded-xl h-12 text-base font-semibold"
                      disabled={loading}
                      data-testid="button-contact-submit"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                      إرسال الرسالة
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
