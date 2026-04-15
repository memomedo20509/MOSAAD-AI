import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Loader2, Languages } from "lucide-react";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
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
    <div className={`min-h-screen flex ${isRTL ? "flex-row-reverse" : ""}`}>
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <div className="flex justify-center mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="gap-2"
                data-testid="button-auth-language-toggle"
              >
                <Languages className="h-4 w-4" />
                {t.switchLanguage}
              </Button>
            </div>
            <CardTitle className="text-2xl">{t.appName}</CardTitle>
            <CardDescription>{t.customerManagementSystem}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
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
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login">
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
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register">
                    {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.createAccount}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className={`hidden lg:flex flex-1 items-center justify-center bg-primary p-8 ${isRTL ? "order-first" : ""}`}>
        <div className="text-center text-primary-foreground max-w-md">
          <Building2 className="h-16 w-16 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">{t.welcomeToCRM}</h2>
          <p className="text-lg opacity-90">
            {t.crmDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
