import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError(t.forgotPasswordError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <title>{t.forgotPasswordTitle} — SalesBot AI</title>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 mb-4">
              <Mail className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.forgotPasswordTitle}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">{t.forgotPasswordDesc}</p>
          </div>

          <Card className="shadow-xl border border-gray-100">
            <CardContent className="p-6">
              {sent ? (
                <div className="text-center py-4" data-testid="text-forgot-password-sent">
                  <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-4">
                    {t.forgotPasswordSent}
                  </div>
                  <Link href="/auth">
                    <Button variant="outline" className="gap-2" data-testid="link-back-to-login">
                      <ArrowLeft className="h-4 w-4" />
                      {t.login}
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">{t.email}</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.profileEmailPlaceholder}
                      required
                      dir={isRTL ? "rtl" : "ltr"}
                      data-testid="input-forgot-email"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive" data-testid="text-forgot-error">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    disabled={isLoading}
                    data-testid="button-forgot-submit"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.forgotPasswordSubmit}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-5">
            <Link href="/auth" className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1" data-testid="link-forgot-back">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.login}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
