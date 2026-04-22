import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type LoginData = { username: string; password: string };

export default function PlatformLoginPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");

  if (user) {
    if (user.role === "platform_admin") {
      navigate("/platform");
    } else {
      navigate("/");
    }
    return null;
  }

  const platformLoginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/platform/login", credentials);
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      try {
        const body = JSON.parse(error.message.replace(/^\d+:\s*/, ""));
        setErrorMsg(body.error || t.platformLoginFail);
      } catch {
        setErrorMsg(t.platformLoginFail);
      }
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    platformLoginMutation.mutate(loginData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t.platformLoginTitle}</CardTitle>
          <CardDescription>{t.platformLoginDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-login-username">{t.platformLoginUserLabel}</Label>
              <Input
                id="platform-login-username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
                autoComplete="username"
                data-testid="input-platform-login-username"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-login-password">{t.platformLoginPassLabel}</Label>
              <Input
                id="platform-login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                autoComplete="current-password"
                data-testid="input-platform-login-password"
                dir="ltr"
              />
            </div>
            {errorMsg && (
              <p className="text-sm text-destructive" data-testid="text-platform-login-error">{errorMsg}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={platformLoginMutation.isPending}
              data-testid="button-platform-login"
            >
              {platformLoginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.platformLoginBtn}
            </Button>

            {import.meta.env.DEV && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setErrorMsg("");
                    platformLoginMutation.mutate({ username: "platform", password: "Platform@123" });
                  }}
                  disabled={platformLoginMutation.isPending}
                  data-testid="button-platform-quick-login"
                >
                  {t.quickLoginDev}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
