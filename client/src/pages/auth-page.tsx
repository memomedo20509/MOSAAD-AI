import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Shield, Clock, Languages } from "lucide-react";
import { WAChatMockup } from "@/components/public-mockups";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const BENEFITS = [
    { icon: Zap, title: t.authBenefit1Title, desc: t.authBenefit1Desc },
    { icon: Shield, title: t.authBenefit2Title, desc: t.authBenefit2Desc },
    { icon: Clock, title: t.authBenefit3Title, desc: t.authBenefit3Desc },
  ];
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
  });
  const [registerError, setRegisterError] = useState("");

  if (user) {
    navigate("/");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError(t.passwordsMismatch);
      return;
    }

    if (registerData.password.length < 6) {
      setRegisterError(t.passwordMinLength);
      return;
    }

    registerMutation.mutate({
      username: registerData.username,
      password: registerData.password,
      email: registerData.email || undefined,
      firstName: registerData.firstName || undefined,
      lastName: registerData.lastName || undefined,
    });
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  return (
    <>
      <title>{t.authPageTitle}</title>
      <meta name="description" content={t.authPageMeta} />

      <section className="min-h-screen pt-16 grid lg:grid-cols-2">
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 px-12 py-16 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/4 h-48 w-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold text-white leading-snug mb-3">
              {t.authHeroHeadline}{" "}
              <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                {t.authHeroHighlight}
              </span>
            </h2>
            <p className="text-indigo-200 text-base mb-10 leading-relaxed">
              {t.authHeroDesc}
            </p>

            <div className="space-y-5">
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <Icon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{title}</div>
                    <div className="text-indigo-300 text-xs mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {["AS", "SA", "ME", "NZ"].map((initials, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full border-2 border-indigo-900 flex items-center justify-center text-white text-[10px] font-bold ${
                      ["bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-pink-500"][i]
                    }`}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-indigo-200 text-xs leading-relaxed">
                <span className="text-white font-semibold">{t.authSocialProofCount}</span> {t.authSocialProofLabel}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10">
            <WAChatMockup />
          </div>
        </div>

        {/* Right column — form */}
        <div className="flex flex-col justify-center items-center px-6 py-12 bg-gray-50 dark:bg-gray-950">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-auth-headline">
                {t.welcomeBack}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">{t.loginSubtitle}</p>
            </div>

            {/* Language toggle */}
            <div className="flex justify-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="gap-2 text-gray-500 hover:text-gray-700"
                data-testid="button-auth-language-toggle"
              >
                <Languages className="h-4 w-4" />
                {t.switchLanguage}
              </Button>
            </div>

            <Card className="shadow-xl border border-gray-100">
              <CardContent className="p-6">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login" data-testid="tab-login">{t.login}</TabsTrigger>
                    <TabsTrigger value="register" data-testid="tab-register">{t.createAccount}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">{t.username}</Label>
                        <Input
                          id="login-username"
                          value={loginData.username}
                          onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                          required
                          data-testid="input-login-username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">{t.password}</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                          data-testid="input-login-password"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t.login}
                      </Button>

                      {import.meta.env.DEV && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              loginMutation.mutate({ username: "admin", password: "Admin@123" });
                            }}
                            disabled={loginMutation.isPending}
                            data-testid="button-quick-login"
                          >
                            {t.quickLoginDev}
                          </Button>
                        </div>
                      )}
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstName">{t.firstName}</Label>
                          <Input
                            id="register-firstName"
                            value={registerData.firstName}
                            onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                            data-testid="input-register-firstName"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-lastName">{t.lastName}</Label>
                          <Input
                            id="register-lastName"
                            value={registerData.lastName}
                            onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                            data-testid="input-register-lastName"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-username">{t.username} *</Label>
                        <Input
                          id="register-username"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                          required
                          data-testid="input-register-username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email">{t.email}</Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          data-testid="input-register-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">{t.password} *</Label>
                        <Input
                          id="register-password"
                          type="password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          required
                          data-testid="input-register-password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-confirmPassword">{t.confirmPassword} *</Label>
                        <Input
                          id="register-confirmPassword"
                          type="password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          required
                          data-testid="input-register-confirmPassword"
                        />
                      </div>
                      {registerError && (
                        <p className="text-sm text-destructive" data-testid="text-register-error">{registerError}</p>
                      )}
                      <Button
                        type="submit"
                        className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t.createAccount}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-gray-500 mt-5">
              {t.noAccountYet}{" "}
              <Link href="/register" className="text-indigo-600 hover:underline font-medium">{t.registerFree}</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
