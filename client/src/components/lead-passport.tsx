import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  LogIn,
  ArrowRightLeft,
  UserCheck,
  PhoneCall,
  MessageCircle,
  FileText,
  Sparkles,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import type { LeadHistory } from "@shared/schema";

interface LeadPassportProps {
  leadId: string;
}

type FilterType = "all" | "created" | "state_change" | "assignment" | "call" | "whatsapp" | "note" | "other";

const TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
}> = {
  created: {
    icon: <LogIn className="h-3.5 w-3.5" />,
    bgColor: "bg-emerald-100 dark:bg-emerald-950",
    textColor: "text-emerald-600 dark:text-emerald-400",
    label: "دخل السيستم",
  },
  state_change: {
    icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
    bgColor: "bg-purple-100 dark:bg-purple-950",
    textColor: "text-purple-600 dark:text-purple-400",
    label: "تغيير الحالة",
  },
  assignment: {
    icon: <UserCheck className="h-3.5 w-3.5" />,
    bgColor: "bg-blue-100 dark:bg-blue-950",
    textColor: "text-blue-600 dark:text-blue-400",
    label: "تعيين",
  },
  call: {
    icon: <PhoneCall className="h-3.5 w-3.5" />,
    bgColor: "bg-amber-100 dark:bg-amber-950",
    textColor: "text-amber-600 dark:text-amber-400",
    label: "مكالمة",
  },
  whatsapp: {
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    bgColor: "bg-green-100 dark:bg-green-950",
    textColor: "text-green-600 dark:text-green-400",
    label: "واتساب",
  },
  note: {
    icon: <FileText className="h-3.5 w-3.5" />,
    bgColor: "bg-gray-100 dark:bg-gray-900",
    textColor: "text-gray-600 dark:text-gray-400",
    label: "ملاحظة",
  },
  other: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    bgColor: "bg-slate-100 dark:bg-slate-900",
    textColor: "text-slate-600 dark:text-slate-400",
    label: "أخرى",
  },
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "created", label: "دخل السيستم" },
  { value: "state_change", label: "تغيير الحالة" },
  { value: "assignment", label: "تعيين" },
  { value: "call", label: "مكالمات" },
  { value: "whatsapp", label: "واتساب" },
  { value: "note", label: "ملاحظات" },
  { value: "other", label: "أخرى" },
];

export function LeadPassport({ leadId }: LeadPassportProps) {
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  const { data: history, isLoading } = useQuery<LeadHistory[]>({
    queryKey: ["/api/leads", leadId, "history"],
    enabled: !!leadId,
  });

  const filteredHistory = (history ?? [])
    .filter((item) => typeFilter === "all" || item.type === typeFilter)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });

  const getTypeConfig = (type: string | null) => {
    return TYPE_CONFIG[type ?? "other"] ?? TYPE_CONFIG.other;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
          <SelectTrigger className="h-8 text-xs w-[160px]" data-testid="select-history-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filteredHistory.length} {filteredHistory.length === 1 ? "حدث" : "أحداث"}
        </span>
        {typeFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setTypeFilter("all")}
            data-testid="button-clear-history-filter"
          >
            مسح
          </Button>
        )}
      </div>

      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">لا يوجد سجل بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute right-4 top-0 bottom-4 w-0.5 bg-border ltr:right-auto ltr:left-4" />
          <div className="space-y-0">
            {filteredHistory.map((item, index) => {
              const config = getTypeConfig(item.type);
              const isLast = index === filteredHistory.length - 1;
              return (
                <div
                  key={item.id}
                  className="relative pr-11 pb-4 ltr:pr-0 ltr:pl-11"
                  data-testid={`timeline-entry-${item.id}`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute right-2 top-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10 ltr:right-auto ltr:left-2 ${config.bgColor} ${config.textColor}`}
                  >
                    {config.icon}
                  </div>

                  {/* Content card */}
                  <div className={`rounded-lg border p-3 text-sm bg-background transition-colors hover:bg-muted/30 ${isLast ? "border-primary/30" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs px-1.5 py-0 ${config.bgColor} ${config.textColor} border-0`}
                          data-testid={`badge-history-type-${item.id}`}
                        >
                          {config.label}
                        </Badge>
                        <span className="font-medium text-foreground">{item.action}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {item.createdAt ? format(new Date(item.createdAt), "dd/MM HH:mm") : "—"}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    {item.performedBy && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        بواسطة: <span className="font-medium text-muted-foreground">{item.performedBy}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
