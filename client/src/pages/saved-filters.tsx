import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Star, Pencil, Trash2 } from "lucide-react";

export default function SavedFiltersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-filters-title">
          Saved Filters
        </h1>
        <p className="text-muted-foreground">Manage your saved filter presets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No saved filters</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
              When you save a filter preset from the leads page, it will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
