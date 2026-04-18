import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, Menu, X, Globe, Twitter, Linkedin, Instagram } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية", labelEn: "Home" },
  { href: "/pricing", label: "الأسعار", labelEn: "Pricing" },
  { href: "/about", label: "من نحن", labelEn: "About" },
  { href: "/contact", label: "تواصل معنا", labelEn: "Contact" },
];

const DARK_HERO_ROUTES = new Set(["/", "/pricing", "/about", "/contact"]);

function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  const hasDarkHero = DARK_HERO_ROUTES.has(location) || location === "/blog" || location.startsWith("/blog/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const t = (ar: string, en: string) => lang === "ar" ? ar : en;

  const isTransparent = hasDarkHero && !scrolled && !mobileOpen;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isTransparent
          ? "bg-transparent"
          : "bg-white/98 backdrop-blur-md shadow-sm border-b border-gray-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className={`bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold tracking-tight ${isTransparent ? "text-white drop-shadow" : ""}`}>
              SalesBot AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-indigo-600 ${
                  location === link.href
                    ? "text-indigo-600"
                    : isTransparent ? "text-white/90" : "text-gray-700"
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
              className={`gap-1 text-xs ${isTransparent ? "text-white/80 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-indigo-600"}`}
              data-testid="button-public-lang"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "ar" ? "EN" : "عربي"}
            </Button>
            <Link href="/auth">
              <Button
                variant="outline"
                size="sm"
                className={isTransparent ? "border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white" : ""}
                data-testid="link-public-login"
              >
                {t("تسجيل الدخول", "Login")}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md"
                data-testid="link-public-signup"
              >
                {t("ابدأ مجاناً", "Get Started Free")}
              </Button>
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-lg ${isTransparent ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"}`}
            onClick={() => setMobileOpen(o => !o)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 shadow-lg">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-sm font-medium py-1 hover:text-indigo-600 transition-colors ${location === link.href ? "text-indigo-600" : "text-gray-700"}`}
              onClick={() => setMobileOpen(false)}
            >
              {t(link.label, link.labelEn)}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link href="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full" data-testid="link-mobile-login">
                {t("تسجيل الدخول", "Login")}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0" data-testid="link-mobile-signup">
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
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-extrabold">
                SalesBot AI
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              منصة الذكاء الاصطناعي الأولى في المنطقة العربية لإدارة المحادثات وتحويلها إلى عملاء فعليين من خلال CRM متكامل وبوت ذكي.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="h-9 w-9 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition-colors">
                <Twitter className="h-4 w-4 text-gray-400" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition-colors">
                <Linkedin className="h-4 w-4 text-gray-400" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-gray-800 hover:bg-purple-600 flex items-center justify-center transition-colors">
                <Instagram className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">المنتج</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/pricing" className="hover:text-white transition-colors">الأسعار</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">مميزات المنصة</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">تجربة مجانية</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">طلب عرض تجريبي</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">الشركة</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">الرئيسية</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">من نحن</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">تواصل معنا</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">قانوني</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">شروط الاستخدام</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div>© {new Date().getFullYear()} SalesBot AI. جميع الحقوق محفوظة.</div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span>جميع الأنظمة تعمل بشكل طبيعي</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
