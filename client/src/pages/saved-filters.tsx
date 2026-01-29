import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Star, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function SavedFiltersPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-filters-title">
          {t.savedFiltersTitle}
        </h1>
        <p className="text-muted-foreground">{t.savedFiltersSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.filters}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t.noFiltersYet}</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
              {t.savedFiltersSubtitle}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
