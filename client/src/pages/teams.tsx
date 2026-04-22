import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function TeamsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.teamsTitle}</h1>
        <p className="text-muted-foreground">{t.teamsDesc}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.teamsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t.teamsEmpty}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
