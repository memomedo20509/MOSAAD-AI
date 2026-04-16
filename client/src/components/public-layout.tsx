import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X, Globe, ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية", labelEn: "Home" },
  { href: "/pricing", label: "الأسعار", labelEn: "Pricing" },
  { href: "/about", label: "من نحن", labelEn: "About" },
  { href: "/contact", label: "تواصل معنا", labelEn: "Contact" },
];

function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [location] = useLocation();

  const t = (ar: string, en: string) => lang === "ar" ? ar : en;

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span>SalesBot AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-primary" : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t(link.label, link.labelEn)}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(l => l === "ar" ? "en" : "ar")}
              className="gap-1 text-xs"
              data-testid="button-public-lang"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "ar" ? "EN" : "عربي"}
            </Button>
            <Link href="/auth">
              <Button variant="outline" size="sm" data-testid="link-public-login">
                {t("تسجيل الدخول", "Login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="link-public-signup">
                {t("ابدأ مجاناً", "Get Started Free")}
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(o => !o)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-3">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
              onClick={() => setMobileOpen(false)}
            >
              {t(link.label, link.labelEn)}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
            <Link href="/auth">
              <Button variant="outline" size="sm" className="w-full" data-testid="link-mobile-login">
                {t("تسجيل الدخول", "Login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="w-full" data-testid="link-mobile-signup">
                {t("ابدأ مجاناً", "Get Started Free")}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-white mb-3">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span>SalesBot AI</span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm">
              منصة الذكاء الاصطناعي لإدارة المحادثات وتحويلها إلى عملاء فعليين من خلال CRM متكامل.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">الرئيسية</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">الأسعار</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">من نحن</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">تواصل معنا</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">إنشاء حساب</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">قانوني</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">شروط الاستخدام</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} SalesBot AI. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950" dir="rtl">
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
