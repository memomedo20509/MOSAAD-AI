import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Phone, MapPin, Loader2, CheckCircle } from "lucide-react";

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
      <section className="bg-gradient-to-br from-primary/10 to-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-contact-headline">
            تواصل معنا
          </h1>
          <p className="text-xl text-gray-600">
            فريقنا جاهز للإجابة على جميع استفساراتك
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">معلومات التواصل</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">البريد الإلكتروني</div>
                    <a href="mailto:hello@salesbot.ai" className="text-primary hover:underline">hello@salesbot.ai</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">الهاتف / واتساب</div>
                    <a href="https://wa.me/201000000000" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      +20 100 000 0000
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">الموقع</div>
                    <div className="text-gray-600">القاهرة، جمهورية مصر العربية</div>
                  </div>
                </div>
              </div>

              <Card className="mt-8 bg-primary/5 border-0">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">أوقات الدعم</h3>
                  <p className="text-gray-600 text-sm">
                    الأحد - الخميس: 9 صباحاً - 6 مساءً<br />
                    الجمعة - السبت: 10 صباحاً - 4 مساءً<br />
                    البوت يرد 24/7 على جميع القنوات!
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact form */}
            <div>
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12" data-testid="contact-success">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">تم الإرسال بنجاح!</h3>
                  <p className="text-gray-600">
                    شكراً لتواصلك معنا. سيقوم فريقنا بالرد عليك خلال 24 ساعة.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-contact">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">الاسم *</Label>
                      <Input
                        id="contact-name"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">البريد الإلكتروني *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        required
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">رقم الهاتف</Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        data-testid="input-contact-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-company">اسم الشركة</Label>
                      <Input
                        id="contact-company"
                        value={form.company}
                        onChange={e => setForm({ ...form, company: e.target.value })}
                        data-testid="input-contact-company"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">الرسالة *</Label>
                    <Textarea
                      id="contact-message"
                      rows={5}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="كيف يمكننا مساعدتك؟"
                      required
                      data-testid="input-contact-message"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading} data-testid="button-contact-submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                    إرسال الرسالة
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
