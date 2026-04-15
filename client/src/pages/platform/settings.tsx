import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Info } from "lucide-react";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات المنصة</h1>
        <p className="text-muted-foreground">إعدادات وتكوينات المنصة العامة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            معلومات المنصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">اسم المنصة</p>
              <p className="font-medium">SalesBot AI</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الإصدار</p>
              <p className="font-medium">v1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            ستتوفر المزيد من الإعدادات قريباً في التحديثات القادمة.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
