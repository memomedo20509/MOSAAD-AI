import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, KeyRound, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenInvalid, setTokenInvalid] = useState(!token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t.passwordMinLength6);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, newPassword });
      navigate("/auth?resetSuccess=1");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("expired") || msg.includes("Invalid")) {
        setTokenInvalid(true);
      } else {
        setError(t.resetPasswordError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <title>{t.resetPasswordTitle} — SalesBot AI</title>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 mb-4">
              <KeyRound className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.resetPasswordTitle}
            </h1>
          </div>

          <Card className="shadow-xl border border-gray-100">
            <CardContent className="p-6">
              {tokenInvalid ? (
                <div className="text-center py-4" data-testid="text-reset-token-invalid">
                  <div className="flex items-center justify-center gap-2 text-destructive mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{t.resetPasswordExpired}</span>
                  </div>
                  <Link href="/forgot-password">
                    <Button variant="outline" data-testid="link-request-new-reset">
                      {t.forgotPasswordSubmit}
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-new-password">{t.newPassword}</Label>
                    <Input
                      id="reset-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-reset-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm-password">{t.confirmNewPassword}</Label>
                    <Input
                      id="reset-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      data-testid="input-reset-confirm-password"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive" data-testid="text-reset-error">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    disabled={isLoading}
                    data-testid="button-reset-submit"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.resetPassword}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-5">
            <Link href="/auth" className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1" data-testid="link-reset-back">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.login}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
