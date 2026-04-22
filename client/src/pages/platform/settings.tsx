import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function PlatformSettingsPage() {
  const { t, isRTL } = useLanguage();
  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold">{t.platformSettingsTitle}</h1>
        <p className="text-muted-foreground">{t.platformSettingsDesc}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {t.platformSettingsInfoTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t.platformSettingsNameLabel}</p>
              <p className="font-medium">SalesBot AI</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.platformSettingsVersionLabel}</p>
              <p className="font-medium">v1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.platformSettingsComingSoon}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
