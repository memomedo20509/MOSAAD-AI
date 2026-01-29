import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Phone, Mail, Copy, X, UserCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function DuplicatedLeadsPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-duplicated-title">
            {t.duplicatedLeadsTitle}
          </h1>
          <p className="text-muted-foreground">{t.duplicatedLeadsSubtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchLeads}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
            data-testid="input-search-duplicates"
          />
        </div>
        <div className="text-sm text-muted-foreground">0 {t.duplicatedLeads}</div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Copy className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{t.noDuplicatesFound}</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
            {t.duplicatedLeadsSubtitle}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
