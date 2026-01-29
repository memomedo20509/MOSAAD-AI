import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, Activity, Calendar, User } from "lucide-react";
import type { LeadHistory } from "@shared/schema";
import { format } from "date-fns";

export default function ActionsLogPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allHistory, isLoading } = useQuery<LeadHistory[]>({
    queryKey: ["/api/history"],
  });

  const filteredHistory = allHistory?.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.performedBy?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-actions-title">
            Actions Log
          </h1>
          <p className="text-muted-foreground">Track all actions performed on leads</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-actions"
          />
        </div>
        <div className="text-sm text-muted-foreground" data-testid="text-actions-count">
          {filteredHistory?.length || 0} actions
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredHistory && filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <Card key={item.id} className="hover-elevate" data-testid={`card-action-${item.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{item.action}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {item.performedBy && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.performedBy}
                          </div>
                        )}
                        {item.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Lead Action
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No actions recorded</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
              Actions performed on leads will be logged here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
