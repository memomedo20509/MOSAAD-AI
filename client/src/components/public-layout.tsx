import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, Menu, X, Globe, Twitter, Linkedin, Instagram } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const DARK_HERO_ROUTES = new Set(["/", "/pricing", "/about", "/contact"]);

function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const hasDarkHero = DARK_HERO_ROUTES.has(location) || location === "/blog" || location.startsWith("/blog/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isTransparent = hasDarkHero && !scrolled && !mobileOpen;

  const NAV_LINKS = [
    { href: "/", label: t.pub_navHome },
    { href: "/pricing", label: t.pub_navPricing },
    { href: "/about", label: t.pub_navAbout },
    { href: "/contact", label: t.pub_navContact },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isTransparent
          ? "bg-transparent"
          : "bg-white shadow-sm border-b border-gray-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            {isTransparent ? (
              <span className="text-white font-extrabold tracking-tight drop-shadow-sm">
                SalesBot AI
              </span>
            ) : (
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold tracking-tight">
                SalesBot AI
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isTransparent
                    ? location === link.href
                      ? "text-white font-semibold drop-shadow-sm"
                      : "text-white hover:text-white drop-shadow-sm"
                    : location === link.href
                      ? "text-indigo-600"
                      : "text-gray-700 hover:text-indigo-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className={`gap-1 text-xs ${isTransparent ? "text-white/80 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-indigo-600"}`}
              data-testid="button-public-lang"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === "ar" ? "EN" : "عربي"}
            </Button>
            <Link href="/auth">
              <Button
                variant="outline"
                size="sm"
                className={isTransparent ? "border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white" : ""}
                data-testid="link-public-login"
              >
                {t.pub_navLogin}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md"
                data-testid="link-public-signup"
              >
                {t.pub_navSignup}
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
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setLanguage(language === "ar" ? "en" : "ar"); setMobileOpen(false); }}
              className="w-full justify-start gap-2 text-gray-600"
              data-testid="button-mobile-lang"
            >
              <Globe className="h-3.5 w-3.5" />
              {language === "ar" ? "English" : "العربية"}
            </Button>
            <Link href="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full" data-testid="link-mobile-login">
                {t.pub_navLogin}
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0" data-testid="link-mobile-signup">
                {t.pub_navSignup}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function PublicFooter() {
  const { t } = useLanguage();

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
              {t.pub_footerDesc}
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
            <h4 className="font-semibold text-white mb-4 text-sm">{t.pub_footerProduct}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/pricing" className="hover:text-white transition-colors">{t.pub_footerPricing}</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">{t.pub_footerFeatures}</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">{t.pub_footerFreeTrial}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t.pub_footerDemo}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">{t.pub_footerCompany}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">{t.pub_footerHome}</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">{t.pub_footerAbout}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t.pub_footerContact}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">{t.pub_footerLegal}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">{t.pub_footerPrivacy}</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">{t.pub_footerTerms}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div>© {new Date().getFullYear()} SalesBot AI. {t.pub_footerCopyright}</div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span>{t.pub_footerStatus}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen flex flex-col bg-white`} dir={isRTL ? "rtl" : "ltr"}>
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
