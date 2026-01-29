import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  filters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}

export function FilterPanel({ open, onClose, filters, onApply }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, open]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onApply({});
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Filter Leads</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 py-4">
          <div className="space-y-4 pr-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={localFilters.channel || ""}
                onValueChange={(v) => setLocalFilters({ ...localFilters, channel: v })}
              >
                <SelectTrigger data-testid="filter-channel">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Cold Call">Cold Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaign</Label>
              <Input
                placeholder="Enter campaign name"
                value={localFilters.campaign || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, campaign: e.target.value })}
                data-testid="filter-campaign"
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Input
                placeholder="Enter sales rep name"
                value={localFilters.assignedTo || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, assignedTo: e.target.value })}
                data-testid="filter-assigned"
              />
            </div>

            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select
                value={localFilters.requestType || ""}
                onValueChange={(v) => setLocalFilters({ ...localFilters, requestType: v })}
              >
                <SelectTrigger data-testid="filter-request-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Invest">Invest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit Type</Label>
              <Select
                value={localFilters.unitType || ""}
                onValueChange={(v) => setLocalFilters({ ...localFilters, unitType: v })}
              >
                <SelectTrigger data-testid="filter-unit-type">
                  <SelectValue placeholder="All unit types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Unit Types</SelectItem>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Duplex">Duplex</SelectItem>
                  <SelectItem value="Penthouse">Penthouse</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Shop">Shop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Area</Label>
              <Input
                placeholder="Enter area"
                value={localFilters.area || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, area: e.target.value })}
                data-testid="filter-area"
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Enter location"
                value={localFilters.location || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value })}
                data-testid="filter-location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Budget</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={localFilters.budgetMin || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, budgetMin: e.target.value })}
                  data-testid="filter-budget-min"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Budget</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localFilters.budgetMax || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, budgetMax: e.target.value })}
                  data-testid="filter-budget-max"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Select
                  value={localFilters.bedrooms || ""}
                  onValueChange={(v) => setLocalFilters({ ...localFilters, bedrooms: v })}
                >
                  <SelectTrigger data-testid="filter-bedrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Select
                  value={localFilters.bathrooms || ""}
                  onValueChange={(v) => setLocalFilters({ ...localFilters, bathrooms: v })}
                >
                  <SelectTrigger data-testid="filter-bathrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4 border-t gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClear} data-testid="button-clear-filters">
            Clear All
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-filters">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
