import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, FileX } from "lucide-react";

export default function WithdrawnLeadsPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-withdrawn-title">
            Withdrawn Leads
          </h1>
          <p className="text-muted-foreground">Leads that have withdrawn their requests</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search withdrawn leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-withdrawn"
          />
        </div>
        <div className="text-sm text-muted-foreground">0 withdrawn leads</div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileX className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No withdrawn leads</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
            Leads that withdraw their requests will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
