import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, Users, BarChart3, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  planId: string | null;
  status: string;
  createdAt: string;
  usersCount: number;
  leadsCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export default function PlatformCompaniesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { t, isRTL } = useLanguage();

  const STATUS_LABELS: Record<string, string> = {
    active: t.statusActive,
    trial: t.statusTrial,
    suspended: t.statusSuspended,
    cancelled: t.statusCancelled,
  };

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/platform/companies"],
  });

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.platformCompaniesTitle}</h1>
          <p className="text-muted-foreground">{t.platformCompaniesDesc}</p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2">
          {companies.length} {t.platformCompaniesCountSuffix}
        </Badge>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={t.platformCompaniesSearch}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={isRTL ? "pr-9" : "pl-9"}
            data-testid="input-search-companies"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder={t.platformCompaniesStatusPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.platformCompaniesAllStatuses}</SelectItem>
            <SelectItem value="active">{t.statusActive}</SelectItem>
            <SelectItem value="trial">{t.statusTrial}</SelectItem>
            <SelectItem value="suspended">{t.statusSuspended}</SelectItem>
            <SelectItem value="cancelled">{t.statusCancelled}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t.platformCompaniesNoMatch}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow" data-testid={`card-company-${company.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{company.name}</h3>
                        <Badge className={`text-xs ${STATUS_COLORS[company.status] ?? ""}`}>
                          {STATUS_LABELS[company.status] ?? company.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {company.usersCount} {t.platformCompaniesUsers}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {company.leadsCount} {t.platformCompaniesLeads}
                        </span>
                        {company.industry && <span>{company.industry}</span>}
                      </div>
                    </div>
                  </div>
                  <Link href={`/platform/companies/${company.id}`}>
                    <Button variant="ghost" size="sm" data-testid={`button-company-detail-${company.id}`}>
                      <ChevronLeft className="h-4 w-4" />
                      {t.platformCompaniesDetails}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
