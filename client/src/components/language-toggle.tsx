import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
      data-testid="button-language-toggle"
      className="text-xs font-medium"
    >
      {t.switchLanguage}
    </Button>
  );
}
